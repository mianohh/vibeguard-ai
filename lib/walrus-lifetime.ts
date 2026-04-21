/**
 * Walrus Blob Lifetime Tracking
 * 
 * Monitors threat evidence blobs and extends storage epochs before expiration.
 * Critical for enterprise-grade threat intelligence infrastructure.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/store';
const EXTENSION_EPOCHS = 5; // Extend by 5 epochs when near expiration
const WARNING_THRESHOLD_EPOCHS = 2; // Warn when <2 epochs remaining

interface BlobLifetime {
  blobId: string;
  blobObjectId: string;
  currentEpoch: number;
  expirationEpoch: number;
  epochsRemaining: number;
  needsExtension: boolean;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Fetch blob object from Sui and extract lifetime information
 */
async function getBlobLifetime(blobObjectId: string): Promise<BlobLifetime | null> {
  try {
    const obj = await suiClient.getObject({
      id: blobObjectId,
      options: { showContent: true }
    });

    if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') {
      console.error(`Blob object ${blobObjectId} not found or invalid`);
      return null;
    }

    const fields = obj.data.content.fields as any;
    const blobId = fields.blob_id || fields.id;
    const storedEpoch = parseInt(fields.stored_epoch || '0');
    const endEpoch = parseInt(fields.end_epoch || fields.expiration_epoch || '0');

    // Get current epoch from system state
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const currentEpoch = parseInt(epoch);
    const epochsRemaining = endEpoch - currentEpoch;

    return {
      blobId,
      blobObjectId,
      currentEpoch,
      expirationEpoch: endEpoch,
      epochsRemaining,
      needsExtension: epochsRemaining <= WARNING_THRESHOLD_EPOCHS,
      severity: epochsRemaining <= 1 ? 'Critical' : epochsRemaining <= 2 ? 'High' : 'Medium'
    };
  } catch (error) {
    console.error(`Error fetching blob lifetime for ${blobObjectId}:`, error);
    return null;
  }
}

/**
 * Extend blob storage by uploading the same content with new epochs
 */
async function extendBlobLifetime(blobId: string, content: string): Promise<string | null> {
  try {
    console.log(`🔄 Extending blob ${blobId} by ${EXTENSION_EPOCHS} epochs...`);

    const response = await fetch(`${WALRUS_PUBLISHER}?epochs=${EXTENSION_EPOCHS}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: content
    });

    if (!response.ok) {
      throw new Error(`Walrus extension failed: ${response.status}`);
    }

    const result = await response.json();
    const newBlobObjectId = result.newlyCreated?.blobObject?.id ?? result.alreadyCertified?.blobObject?.id;

    console.log(`✅ Blob extended successfully. New object ID: ${newBlobObjectId}`);
    return newBlobObjectId;
  } catch (error) {
    console.error(`Error extending blob ${blobId}:`, error);
    return null;
  }
}

/**
 * Fetch blob content from Walrus aggregator
 */
async function fetchBlobContent(blobId: string): Promise<string | null> {
  try {
    const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`;
    const response = await fetch(aggregatorUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching blob content for ${blobId}:`, error);
    return null;
  }
}

/**
 * Check all threat blobs and extend those near expiration
 */
export async function checkAndExtendThreats(): Promise<{
  checked: number;
  extended: number;
  failed: number;
  warnings: BlobLifetime[];
}> {
  console.log('🔍 Starting Walrus blob lifetime check...');

  // Fetch all threat reports from on-chain registry
  const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be';
  
  const registry = await suiClient.getObject({
    id: REGISTRY_ID,
    options: { showContent: true }
  });

  if (!registry.data?.content || registry.data.content.dataType !== 'moveObject') {
    throw new Error('Registry not found');
  }

  const fields = registry.data.content.fields as any;
  const threats = fields.threats?.fields?.contents || [];

  let checked = 0;
  let extended = 0;
  let failed = 0;
  const warnings: BlobLifetime[] = [];

  // If no threats, return early
  if (!Array.isArray(threats) || threats.length === 0) {
    console.log('No threats found in registry');
    return { checked: 0, extended: 0, failed: 0, warnings: [] };
  }

  for (const threat of threats) {
    const blobObjectId = threat.blob_object_id || threat.walrus_blob_id;
    if (!blobObjectId) continue;

    checked++;
    const lifetime = await getBlobLifetime(blobObjectId);

    if (!lifetime) {
      failed++;
      continue;
    }

    console.log(`📊 Blob ${lifetime.blobId.slice(0, 10)}... | Epochs remaining: ${lifetime.epochsRemaining} | Severity: ${lifetime.severity}`);

    if (lifetime.needsExtension) {
      warnings.push(lifetime);

      // Fetch original content
      const content = await fetchBlobContent(lifetime.blobId);
      if (!content) {
        failed++;
        continue;
      }

      // Extend lifetime
      const newBlobObjectId = await extendBlobLifetime(lifetime.blobId, content);
      if (newBlobObjectId) {
        extended++;
        // TODO: Update on-chain registry with new blob_object_id
      } else {
        failed++;
      }
    }
  }

  console.log(`\n✅ Blob lifetime check complete:`);
  console.log(`   Checked: ${checked}`);
  console.log(`   Extended: ${extended}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Warnings: ${warnings.length}`);

  return { checked, extended, failed, warnings };
}

/**
 * Get lifetime status for a specific blob
 */
export async function getBlobStatus(blobObjectId: string): Promise<BlobLifetime | null> {
  return getBlobLifetime(blobObjectId);
}

/**
 * Cron job handler for automated blob extension
 */
export async function blobLifetimeCronJob() {
  try {
    const result = await checkAndExtendThreats();
    
    // Log to monitoring service (e.g., Datadog, Sentry)
    if (result.warnings.length > 0) {
      console.warn(`⚠️ ${result.warnings.length} blobs need attention`);
    }

    return result;
  } catch (error) {
    console.error('Blob lifetime cron job failed:', error);
    throw error;
  }
}
