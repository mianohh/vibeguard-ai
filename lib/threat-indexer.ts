/**
 * Threat Intelligence Indexer
 * Indexes ThreatReported events for fast B2B queries
 */

import { SuiClient, getFullnodeUrl, SuiEvent } from '@mysten/sui/client';
import { retrieveThreatReportFromWalrus } from './walrus';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';

export interface IndexedThreat {
  packageId: string;
  blobId: string;
  blobObjectId: string;
  reporter: string;
  category?: 'Honeypot' | 'Phishing' | 'Rug Pull' | 'Intent Mismatch' | 'Unknown';
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  timestamp: number;
  txDigest: string;
  reasons?: string[];
  endEpoch?: number;
  blobStatus?: 'active' | 'expiring' | 'expired';
}

export interface ThreatQueryOptions {
  category?: string;
  severity?: string;
  limit?: number;
  offset?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
}

// In-memory cache (for MVP - replace with Vercel KV/Postgres for production)
const threatCache = new Map<string, IndexedThreat>();
let lastIndexedCursor: string | null | undefined = null;

/**
 * Index ThreatReported events from the blockchain
 * @param fromCursor - Optional cursor to resume from
 * @returns Number of new threats indexed
 */
export async function indexThreats(fromCursor?: string | null): Promise<number> {
  const cursor = fromCursor || lastIndexedCursor || undefined;
  
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${PACKAGE_ID}::registry::ThreatReported`,
    },
    cursor: cursor as any,
    limit: 50,
  });

  let indexed = 0;

  for (const event of events.data) {
    const { malicious_package_id, walrus_blob_id, blob_object_id, reporter } = event.parsedJson as {
      malicious_package_id: string;
      walrus_blob_id: string;
      blob_object_id: string;
      reporter: string;
    };

    // Skip if already indexed
    if (threatCache.has(malicious_package_id)) continue;

    // Fetch full report from Walrus to extract metadata
    let category: IndexedThreat['category'];
    let severity: IndexedThreat['severity'];
    let reasons: string[] | undefined;
    let endEpoch: number | undefined;

    try {
      const report = await retrieveThreatReportFromWalrus(walrus_blob_id);
      category = report.metadata?.category;
      severity = report.metadata?.severity;
      reasons = report.reasons;
      endEpoch = report.endEpoch;
    } catch (error) {
      // Blob may be expired or unavailable - index without metadata
      console.warn(`⚠️ Skipping metadata for ${walrus_blob_id} (blob unavailable)`);
    }

    const indexed_threat: IndexedThreat = {
      packageId: malicious_package_id,
      blobId: walrus_blob_id,
      blobObjectId: blob_object_id,
      reporter,
      category,
      severity,
      timestamp: Number(event.timestampMs),
      txDigest: event.id.txDigest,
      reasons,
      endEpoch,
      blobStatus: endEpoch ? 'active' : undefined,
    };

    threatCache.set(malicious_package_id, indexed_threat);
    indexed++;
  }

  if (events.hasNextPage) {
    lastIndexedCursor = events.nextCursor as any;
  }

  console.log(`✅ Indexed ${indexed} new threats (total: ${threatCache.size})`);
  return indexed;
}

/**
 * Query indexed threats with filters
 * @param options - Query filters
 * @returns Filtered threat list
 */
export function queryThreats(options: ThreatQueryOptions = {}): IndexedThreat[] {
  let results = Array.from(threatCache.values());

  // Filter by category
  if (options.category) {
    results = results.filter(t => t.category === options.category);
  }

  // Filter by severity
  if (options.severity) {
    results = results.filter(t => t.severity === options.severity);
  }

  // Filter by timestamp range
  if (options.fromTimestamp) {
    results = results.filter(t => t.timestamp >= options.fromTimestamp!);
  }
  if (options.toTimestamp) {
    results = results.filter(t => t.timestamp <= options.toTimestamp!);
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => b.timestamp - a.timestamp);

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  return results.slice(offset, offset + limit);
}

/**
 * Get threat by package ID
 * @param packageId - The malicious package ID
 * @returns Indexed threat or null
 */
export function getThreatByPackageId(packageId: string): IndexedThreat | null {
  return threatCache.get(packageId) || null;
}

/**
 * Get threat statistics
 * @returns Aggregated stats
 */
export function getThreatStats() {
  const threats = Array.from(threatCache.values());
  
  const byCategory = threats.reduce((acc, t) => {
    const cat = t.category || 'Unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bySeverity = threats.reduce((acc, t) => {
    const sev = t.severity || 'Unknown';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: threats.length,
    byCategory,
    bySeverity,
    lastIndexed: lastIndexedCursor,
  };
}

/**
 * Initialize indexer - call on app startup
 */
export async function initializeIndexer(): Promise<void> {
  console.log('🔄 Initializing threat indexer...');
  await indexThreats();
}
