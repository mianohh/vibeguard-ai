import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { publishThreatReportToWalrus } from './walrus';

export interface PendingReport {
  maliciousPackageId: string;
  reasons: string[];
  nonce?: string;
}

const BATCH_WINDOW_MS = Number(process.env.PTB_BATCH_WINDOW_MS ?? 1_000); // 1s collection window
const MAX_BATCH_SIZE  = Number(process.env.PTB_MAX_BATCH_SIZE  ?? 5);
const QUEUE_KEY       = 'vibeguard:threat_queue';
const LOCK_KEY        = 'vibeguard:flush_lock';
const LOCK_TTL_MS     = 25_000; // covers full flush pipeline

// ─── Redis client (lazy) ──────────────────────────────────────────────────────

let _redis: any = null;
let _connecting: Promise<any> | null = null;

async function getRedis() {
  if (_redis?.isReady) return _redis;
  if (_connecting) return _connecting;
  const { createClient } = await import('redis');
  _redis = createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: (retries: number) => Math.min(retries * 100, 2000) },
  });
  _redis.on('error', (e: any) => console.error('[ptb-batcher] redis:', e.message));
  _connecting = _redis.connect().then(() => { _connecting = null; return _redis; });
  return _connecting;
}

// ─── Singleton batch state (local, non-Vercel only) ───────────────────────────

let queue: PendingReport[] = [];
let seen:  Set<string>     = new Set();
let windowOpen             = false;

// ─── Public API ───────────────────────────────────────────────────────────────

export function enqueueReport(report: PendingReport): Promise<void> | null {
  if (process.env.REDIS_URL) return _enqueueRedis(report);
  return _enqueueLocal(report);
}

// ─── Redis path (Vercel) ──────────────────────────────────────────────────────

async function _enqueueRedis(report: PendingReport): Promise<void> {
  const redis = await getRedis();

  // Try to become the flusher FIRST before pushing
  // This prevents concurrent flushes racing on the same sponsor coin
  const won = await redis.set(LOCK_KEY, '1', { NX: true, PX: LOCK_TTL_MS });

  // Always push to queue regardless of lock outcome
  await redis.lPush(QUEUE_KEY, JSON.stringify(report));
  console.log(`[ptb-batcher] redis enqueued ${report.maliciousPackageId.slice(0, 14)}...`);

  if (won !== 'OK') {
    console.log(`[ptb-batcher] lock held by another instance — enqueued only`);
    return;
  }

  console.log(`[ptb-batcher] won flush lock — waiting ${BATCH_WINDOW_MS}ms for more reports`);
  await new Promise(r => setTimeout(r, BATCH_WINDOW_MS));
  await _flushFromRedis(redis);
}

async function _flushFromRedis(redis: any): Promise<void> {
  // Drain up to MAX_BATCH_SIZE reports
  const raw = await redis.lRange(QUEUE_KEY, 0, MAX_BATCH_SIZE - 1);
  if (raw.length === 0) { await redis.del(LOCK_KEY); return; }
  await redis.lTrim(QUEUE_KEY, raw.length, -1);
  await redis.del(LOCK_KEY);

  // Deduplicate
  const seen = new Set<string>();
  const batch: PendingReport[] = raw
    .map((r: string) => JSON.parse(r))
    .filter((r: PendingReport) => {
      if (seen.has(r.maliciousPackageId)) return false;
      seen.add(r.maliciousPackageId);
      return true;
    });

  console.log(`[ptb-batcher] flush-start batchSize=${batch.length} reason=window-elapsed`);
  try {
    await _flush(batch);
  } catch (err: any) {
    console.error(`[ptb-batcher] flush-fail: ${err.message}`);
  }

  // If queue still has items, immediately claim lock and flush again
  const remaining = await redis.lLen(QUEUE_KEY);
  if (remaining > 0) {
    const won = await redis.set(LOCK_KEY, '1', { NX: true, PX: LOCK_TTL_MS });
    if (won === 'OK') {
      console.log(`[ptb-batcher] queue still has ${remaining} reports — flushing again`);
      await _flushFromRedis(redis);
    }
  }
}

// ─── In-memory path (local dev) ───────────────────────────────────────────────

function _enqueueLocal(report: PendingReport): Promise<void> | null {
  if (seen.has(report.maliciousPackageId)) {
    console.log(`[ptb-batcher] duplicate skipped: ${report.maliciousPackageId.slice(0, 14)}...`);
    return null;
  }
  seen.add(report.maliciousPackageId);
  queue.push(report);
  console.log(`[ptb-batcher] enqueued ${report.maliciousPackageId.slice(0, 14)}... depth=${queue.length}`);

  if (windowOpen) return null;
  windowOpen = true;
  console.log(`[ptb-batcher] window opened (${BATCH_WINDOW_MS}ms)`);
  return _runLocalWindow();
}

async function _runLocalWindow(): Promise<void> {
  await new Promise(r => setTimeout(r, BATCH_WINDOW_MS));
  const batch = queue.splice(0, MAX_BATCH_SIZE);
  seen.clear();
  windowOpen = false;
  if (batch.length === 0) return;
  console.log(`[ptb-batcher] flush-start batchSize=${batch.length} reason=window-elapsed`);
  try {
    await _flush(batch);
  } catch (err: any) {
    console.error(`[ptb-batcher] flush-fail: ${err.message}`);
  }
}

async function _flush(batch: PendingReport[]): Promise<void> {
  const enclaveUrl    = process.env.ENCLAVE_URL;
  const PACKAGE_ID    = process.env.NEXT_PUBLIC_PACKAGE_ID!;
  const REGISTRY_ID   = process.env.NEXT_PUBLIC_REGISTRY_ID!;
  const SEAL_PKG      = process.env.SEAL_ENCLAVE_PACKAGE_ID!;
  const ENCLAVE_CFG   = process.env.ENCLAVE_CONFIG_OBJECT_ID!;
  const sponsor       = _loadSponsor();
  const reporter      = sponsor.toSuiAddress();

  // ── Step 1: parallel Walrus uploads ────────────────────────────────────────
  const walrusResults = await Promise.allSettled(
    batch.map(r => publishThreatReportToWalrus({
      packageId:         r.maliciousPackageId,
      riskLevel:         'RED',
      reasons:           r.reasons,
      headline:          'Automated Detection: Honeypot/Malicious Contract',
      plainEnglish:      r.reasons.join('; '),
      recommendedAction: 'Do Not Sign',
      reportedAt:        new Date().toISOString(),
      reportedBy:        reporter,
      metadata: {
        title:     'VibeGuard AI Threat Report',
        publisher: reporter,
        category:  'Honeypot',
        severity:  'Critical',
        timestamp: new Date().toISOString(),
      },
    }))
  );

  const withBlobs = batch
    .map((r, i) => ({ r, res: walrusResults[i] }))
    .filter(({ res }) => res.status === 'fulfilled')
    .map(({ r, res }) => ({ report: r, ...(res as PromiseFulfilledResult<any>).value }));

  if (withBlobs.length === 0) {
    console.error('[ptb-batcher] all Walrus uploads failed — aborting flush');
    return;
  }

  // ── Step 2: parallel enclave signing (with local fallback) ─────────────────
  const nowMs = Date.now();
  const signResults = await Promise.allSettled(
    withBlobs.map(async ({ report, blobId }) => {
      if (!enclaveUrl) return null; // signal: use local fallback
      try {
        const res = await fetch(`${enclaveUrl}/sign_report`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            malicious_package_id: report.maliciousPackageId,
            walrus_blob_id:       blobId,
            timestamp_ms:         nowMs,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`sign_report failed: ${await res.text()}`);
        const { signature: sigHex } = await res.json();
        return Buffer.from(sigHex, 'hex').toString('base64');
      } catch {
        return null; // enclave unreachable — will skip verify_and_report
      }
    })
  );

  // All reports proceed regardless — null signature means skip verify_and_report
  const assembled = withBlobs.map((b, i) => ({
    maliciousPackageId: b.report.maliciousPackageId,
    walrusBlobId:       b.blobId,
    blobObjectId:       b.blobObjectId,
    enclaveSignature:   signResults[i].status === 'fulfilled' ? (signResults[i] as PromiseFulfilledResult<string|null>).value : null,
    timestampMs:        nowMs,
  }));

  if (assembled.length === 0) {
    console.error('[ptb-batcher] no reports to assemble — aborting flush');
    return;
  }

  // ── Step 3: build single PTB ────────────────────────────────────────────────
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const tx        = new Transaction();

  for (const a of assembled) {
    if (SEAL_PKG && ENCLAVE_CFG && a.enclaveSignature) {
      tx.moveCall({
        target: `${SEAL_PKG}::enclave::verify_and_report`,
        arguments: [
          tx.object(ENCLAVE_CFG),
          tx.pure.address(a.maliciousPackageId),
          tx.pure.string(a.walrusBlobId),
          tx.pure.vector('u8', Array.from(Buffer.from(a.enclaveSignature, 'base64'))),
          tx.pure.u64(BigInt(a.timestampMs)),
          tx.object('0x6'),
        ],
      });
    } else {
      console.log(`[ptb-batcher] skipping verify_and_report for ${a.maliciousPackageId.slice(0,14)}... (enclave unreachable)`);
    }
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::report_malicious_contract`,
      arguments: [
        tx.object(REGISTRY_ID),
        tx.pure.address(a.maliciousPackageId),
        tx.pure.string(a.walrusBlobId),
        tx.pure.address(a.blobObjectId),
      ],
    });
  }

  const gasBudget = 5_000_000 * assembled.length + 1_000_000;
  tx.setSender(reporter);
  tx.setGasOwner(sponsor.toSuiAddress());
  tx.setGasBudget(gasBudget);

  console.log(`[ptb-batcher] ptb-build batchSize=${assembled.length} moveCalls=${assembled.length * 2} gasBudget=${gasBudget}`);

  const builtBytes = await tx.build({ client: suiClient });
  const { signature: sponsorSig } = await sponsor.signTransaction(builtBytes);

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: builtBytes,
    signature:        [sponsorSig],
    options:          { showEffects: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`PTB execution failed: ${result.effects?.status?.error}`);
  }

  console.log(`[ptb-batcher] flush-success digest=${result.digest} batchSize=${assembled.length} moveCalls=${assembled.length * 2}`);
}

function _loadSponsor(): Ed25519Keypair {
  const key = process.env.SPONSOR_PRIVATE_KEY!;
  if (key.startsWith('suiprivkey')) {
    return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey);
  }
  const raw = Buffer.from(key, 'base64');
  return Ed25519Keypair.fromSecretKey(raw.length === 33 ? raw.slice(1) : raw);
}
