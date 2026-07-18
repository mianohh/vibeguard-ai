import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

export interface PendingReport {
  maliciousPackageId: string;
  reasons: string[];
  nonce?: string;
}

const BATCH_WINDOW_MS = Number(process.env.PTB_BATCH_WINDOW_MS ?? 1_000);
const MAX_BATCH_SIZE  = Number(process.env.PTB_MAX_BATCH_SIZE  ?? 5);
const QUEUE_KEY       = 'vibeguard:threat_queue';
const LOCK_KEY        = 'vibeguard:flush_lock';
const LOCK_TTL_MS     = 25_000;

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

/**
 * Enqueue a report for batched PTB execution.
 * Returns immediately after enqueuing — does NOT wait for PTB execution.
 * The flush happens asynchronously in the background.
 */
export function enqueueReport(report: PendingReport): void {
  if (process.env.REDIS_URL) {
    _enqueueRedis(report).catch(err => 
      console.error('[ptb-batcher] redis enqueue error:', err.message)
    );
  } else {
    _enqueueLocal(report);
  }
}

// ─── Redis path (Vercel) ──────────────────────────────────────────────────────

async function _enqueueRedis(report: PendingReport): Promise<void> {
  const redis = await getRedis();
  const won = await redis.set(LOCK_KEY, '1', { NX: true, PX: LOCK_TTL_MS });
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
  const raw = await redis.lRange(QUEUE_KEY, 0, MAX_BATCH_SIZE - 1);
  if (raw.length === 0) { await redis.del(LOCK_KEY); return; }
  await redis.lTrim(QUEUE_KEY, raw.length, -1);
  await redis.del(LOCK_KEY);

  const seenIds = new Set<string>();
  const batch: PendingReport[] = raw
    .map((r: string) => JSON.parse(r))
    .filter((r: PendingReport) => {
      if (seenIds.has(r.maliciousPackageId)) return false;
      seenIds.add(r.maliciousPackageId);
      return true;
    });

  console.log(`[ptb-batcher] flush-start batchSize=${batch.length} reason=window-elapsed`);
  try {
    await _flush(batch);
  } catch (err: any) {
    console.error(`[ptb-batcher] flush-fail: ${err.message}`);
  }

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

function _enqueueLocal(report: PendingReport): void {
  if (seen.has(report.maliciousPackageId)) {
    console.log(`[ptb-batcher] duplicate skipped: ${report.maliciousPackageId.slice(0, 14)}...`);
    return;
  }
  seen.add(report.maliciousPackageId);
  queue.push(report);
  console.log(`[ptb-batcher] enqueued ${report.maliciousPackageId.slice(0, 14)}... depth=${queue.length}`);

  if (windowOpen) return;
  windowOpen = true;
  console.log(`[ptb-batcher] window opened (${BATCH_WINDOW_MS}ms)`);
  _runLocalWindow(); // Fire and forget — don't await
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

// ─── Core flush — enclave handles Walrus, we just build + execute PTB ─────────

async function _flush(batch: PendingReport[]): Promise<void> {
  const enclaveUrl  = process.env.ENCLAVE_URL;
  const PACKAGE_ID  = process.env.NEXT_PUBLIC_PACKAGE_ID!;
  const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID!;
  const SEAL_PKG    = process.env.SEAL_ENCLAVE_PACKAGE_ID!;
  const ENCLAVE_CFG = process.env.ENCLAVE_CONFIG_OBJECT_ID!;

  if (!enclaveUrl) {
    console.error('[ptb-batcher] ENCLAVE_URL not set — cannot flush. Set it in Vercel environment variables.');
    return;
  }
  if (!PACKAGE_ID || !REGISTRY_ID) {
    console.error('[ptb-batcher] NEXT_PUBLIC_PACKAGE_ID or NEXT_PUBLIC_REGISTRY_ID not set — cannot flush.');
    return;
  }

  const sponsor  = _loadSponsor();
  const reporter = sponsor.toSuiAddress();

  // ── Step 1: call enclave /sign_report per report (parallel)
  // Enclave uploads to Walrus internally and returns blob_id + blob_object_id + signature
  const signResults = await Promise.allSettled(
    batch.map(r =>
      fetch(`${enclaveUrl}/sign_report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          malicious_package_id: r.maliciousPackageId,
          reasons:              r.reasons,
          reporter,
        }),
        signal: AbortSignal.timeout(8000),
      }).then(async res => {
        if (!res.ok) throw new Error(`sign_report failed: ${await res.text()}`);
        return res.json() as Promise<{
          signature: string;
          blob_id: string;
          blob_object_id: string;
          timestamp_ms: number;
        }>;
      })
    )
  );

  const assembled = batch
    .map((r, i) => ({ r, res: signResults[i] }))
    .filter(({ res }) => res.status === 'fulfilled')
    .map(({ r, res }) => {
      const enc = (res as PromiseFulfilledResult<any>).value;
      return {
        maliciousPackageId: r.maliciousPackageId,
        walrusBlobId:       enc.blob_id,
        blobObjectId:       enc.blob_object_id,
        enclaveSignature:   Buffer.from(enc.signature, 'hex').toString('base64'),
        timestampMs:        enc.timestamp_ms,
      };
    });

  if (assembled.length === 0) {
    console.error('[ptb-batcher] all enclave calls failed — aborting flush');
    return;
  }

  // ── Step 2: build single PTB ────────────────────────────────────────────────
  const suiRpcUrl = process.env.SUI_RPC_URL || 'https://sui-testnet.publicnode.com';
  const suiClient = new SuiClient({ url: suiRpcUrl });
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
  tx.setGasOwner(reporter);
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
  // Ed25519 private keys are 32 bytes. If we have 33, the first byte is a flag (0x00)
  const secretKey = raw.length === 33 ? raw.slice(1) : raw;
  if (secretKey.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${secretKey.length}`);
  }
  return Ed25519Keypair.fromSecretKey(secretKey);
}
