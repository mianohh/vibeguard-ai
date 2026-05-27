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

const BATCH_WINDOW_MS = Number(process.env.PTB_BATCH_WINDOW_MS ?? 0); // 0 = flush immediately on Hobby tier
const MAX_BATCH_SIZE  = Number(process.env.PTB_MAX_BATCH_SIZE  ?? 5);

// ─── Singleton batch state ────────────────────────────────────────────────────

let queue: PendingReport[]     = [];
let seen:  Set<string>         = new Set();
let windowOpen                 = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a report.
 * Returns the flush Promise if this call opened the window (first report),
 * or null if the window was already open (subsequent reports just append).
 * The caller should pass a non-null return value to waitUntil().
 */
export function enqueueReport(report: PendingReport): Promise<void> | null {
  if (seen.has(report.maliciousPackageId)) {
    console.log(`[ptb-batcher] duplicate skipped: ${report.maliciousPackageId.slice(0, 14)}...`);
    return null;
  }

  seen.add(report.maliciousPackageId);
  queue.push(report);
  console.log(`[ptb-batcher] enqueued ${report.maliciousPackageId.slice(0, 14)}... depth=${queue.length}`);

  if (windowOpen) return null; // window already running, another instance is the flusher

  // First report — open the window and return the flush promise
  windowOpen = true;
  console.log(`[ptb-batcher] window opened (${BATCH_WINDOW_MS}ms)`);
  return _runWindow();
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function _runWindow(): Promise<void> {
  // Wait for the batch window to collect more reports
  await new Promise(r => setTimeout(r, BATCH_WINDOW_MS));

  // Snapshot and reset state so new reports start a fresh window
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

  // ── Step 2: parallel enclave signing ───────────────────────────────────────
  const nowMs = Date.now();
  const signResults = await Promise.allSettled(
    withBlobs.map(async ({ report, blobId }) => {
      if (!enclaveUrl) throw new Error('ENCLAVE_URL not set');
      const res = await fetch(`${enclaveUrl}/sign_report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          malicious_package_id: report.maliciousPackageId,
          walrus_blob_id:       blobId,
          timestamp_ms:         nowMs,
        }),
      });
      if (!res.ok) throw new Error(`sign_report failed: ${await res.text()}`);
      const { signature: sigHex } = await res.json();
      return Buffer.from(sigHex, 'hex').toString('base64');
    })
  );

  const assembled = withBlobs
    .map((b, i) => ({ ...b, sig: signResults[i] }))
    .filter(({ sig }) => sig.status === 'fulfilled')
    .map(({ report, blobId, blobObjectId, sig }) => ({
      maliciousPackageId: report.maliciousPackageId,
      walrusBlobId:       blobId,
      blobObjectId,
      enclaveSignature:   (sig as PromiseFulfilledResult<string>).value,
      timestampMs:        nowMs,
    }));

  if (assembled.length === 0) {
    console.error('[ptb-batcher] all enclave signings failed — aborting flush');
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
