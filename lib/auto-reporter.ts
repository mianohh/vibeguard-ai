import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import * as fs from 'fs';
import * as path from 'path';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://vibeguardai.vercel.app');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be';
const SEAL_PACKAGE_ID = process.env.SEAL_ENCLAVE_PACKAGE_ID || '0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc';
const ENCLAVE_CONFIG_ID = process.env.ENCLAVE_CONFIG_OBJECT_ID || '0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502';

async function uploadToWalrus(content: string, retries = 3): Promise<{ blobId: string; blobObjectId: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(WALRUS_PUBLISHER, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      });

      if (!response.ok) throw new Error(`Walrus upload failed: ${response.status}`);

      const result = await response.json();
      const blobId = result.newlyCreated?.blobObject?.blobId ?? result.alreadyCertified?.blobId;
      const blobObjectId = result.newlyCreated?.blobObject?.id ?? result.alreadyCertified?.blobObject?.id ?? blobId;

      if (!blobId) throw new Error('No blobId in Walrus response');

      console.log(`Walrus upload: blob ${blobId.replace(/[^a-zA-Z0-9_\-]/g, '')} | object ${blobObjectId.replace(/[^a-zA-Z0-9_\-]/g, '')}`);
      return { blobId, blobObjectId };
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Walrus upload failed after retries');
}

function loadEnclaveKeypair(): Ed25519Keypair {
  if (process.env.ENCLAVE_PRIVATE_KEY) {
    const raw = Buffer.from(process.env.ENCLAVE_PRIVATE_KEY, 'base64');
    return Ed25519Keypair.fromSecretKey(raw);
  }
  const keypairFile = path.resolve(process.cwd(), 'scripts/enclave-keypair.json');
  if (fs.existsSync(keypairFile)) {
    const saved = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));
    return Ed25519Keypair.fromSecretKey(Buffer.from(saved.privateKeyBase64, 'base64'));
  }
  throw new Error('ENCLAVE_PRIVATE_KEY env var not set and enclave-keypair.json not found');
}

function determineCategory(reasons: string[]): 'Honeypot' | 'Phishing' | 'Rug Pull' | 'Intent Mismatch' | 'Unknown' {
  const t = reasons.join(' ').toLowerCase();
  if (t.includes('honeypot')) return 'Honeypot';
  if (t.includes('intent mismatch') || t.includes('unexpected')) return 'Intent Mismatch';
  if (t.includes('phishing') || t.includes('fake')) return 'Phishing';
  if (t.includes('rug pull') || t.includes('drain')) return 'Rug Pull';
  return 'Unknown';
}

function determineSeverity(reasons: string[]): 'Critical' | 'High' | 'Medium' | 'Low' {
  const t = reasons.join(' ').toLowerCase();
  if (t.includes('drain') || t.includes('steal') || t.includes('honeypot')) return 'Critical';
  if (t.includes('unexpected transfer') || t.includes('malicious')) return 'High';
  if (t.includes('suspicious')) return 'Medium';
  return 'High';
}

function buildEvidence(maliciousPackageId: string, reasons: string[], publisher: string, nonce?: string): string {
  const category = determineCategory(reasons);
  const severity = determineSeverity(reasons);
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    metadata: { title: 'VibeGuard AI Threat Report', publisher, category, severity, timestamp },
    packageId: maliciousPackageId,
    riskLevel: 'RED',
    headline: 'Automated Detection: Honeypot/Malicious Contract',
    reasons,
    reportedAt: timestamp,
    reportedBy: 'vibeguard-automated-pipeline',
    nonce: nonce ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

async function submitOnChain(
  walrusBlobId: string,
  blobObjectId: string,
  enclaveSignature: string,
  timestampMs: number,
  sponsorSignature: string,
  txBytes: string,
): Promise<string> {
  const txBytesUint8 = fromBase64(txBytes);
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: txBytesUint8,
    signature: [sponsorSignature],
    options: { showEffects: true },
  });
  if (result.effects?.status?.status !== 'success') {
    throw new Error(`On-chain registration failed: ${result.effects?.status?.error}`);
  }
  return result.digest;
}

export async function autoReportThreat(
  maliciousPackageId: string,
  reasons: string[],
  _enclaveSignature?: string,
  _timestampMs?: number,
  nonce?: string
): Promise<void> {
  console.log(`Auto-reporting malicious package: ${maliciousPackageId}`);

  // PTB Batching: first report opens a 30s window.
  // Subsequent reports within the window just enqueue — the flusher
  // executes a single atomic PTB for all collected reports.
  try {
    const { enqueueReport } = await import('./ptb-batcher');
    const flushPromise = enqueueReport({ maliciousPackageId, reasons, nonce });
    if (flushPromise) {
      // On Vercel: keep function alive past response via waitUntil
      // Locally: run as detached promise (fire-and-forget)
      try {
        const { waitUntil } = await import('@vercel/functions');
        waitUntil(flushPromise.catch(e =>
          console.error('[auto-reporter] flush error:', e.message)
        ));
      } catch {
        flushPromise.catch(e =>
          console.error('[auto-reporter] flush error:', e.message)
        );
      }
    }
    return;
  } catch (err: any) {
    console.warn(`[auto-reporter] PTB batcher unavailable, falling back: ${err.message}`);
  }

  const enclaveUrl = process.env.ENCLAVE_URL;

  if (enclaveUrl) {
    // Production: Walrus first, then enclave signs the final message
    const sponsorKey = process.env.SPONSOR_PRIVATE_KEY;
    if (!sponsorKey) throw new Error('SPONSOR_PRIVATE_KEY not set');
    const sponsorKeypair = Ed25519Keypair.fromSecretKey(fromBase64(sponsorKey).slice(1));
    const reporterAddress = sponsorKeypair.toSuiAddress();

    // 1. Upload evidence to Walrus — nonce ensures unique blob per request
    const { blobId: walrusBlobId, blobObjectId } = await uploadToWalrus(
      buildEvidence(maliciousPackageId, reasons, reporterAddress, nonce)
    );

    // 2. Ask enclave to sign: pkg_bytes(32) + blob_bytes + timestamp_le(8)
    //    This matches exactly what verify_and_report reconstructs in Move
    const timestampMs = Date.now();
    const signRes = await fetch(`${enclaveUrl}/sign_report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        malicious_package_id: maliciousPackageId,
        walrus_blob_id: walrusBlobId,
        timestamp_ms: timestampMs,
      }),
    });
    if (!signRes.ok) throw new Error(`Enclave /sign_report failed: ${await signRes.text()}`);
    const { signature: sigHex } = await signRes.json();
    const enclaveSignature = Buffer.from(sigHex, 'hex').toString('base64');
    console.log('Enclave signed final report');

    // 3. Build sponsored transaction
    const sponsorRes = await fetch(`${BASE_URL}/api/sponsor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: PACKAGE_ID,
        registryId: REGISTRY_ID,
        sealPackageId: SEAL_PACKAGE_ID,
        enclaveConfigId: ENCLAVE_CONFIG_ID,
        maliciousPackageId,
        walrusBlobId,
        blobObjectId,
        enclaveSignature,
        timestampMs,
        sender: reporterAddress,
      }),
    });
    if (!sponsorRes.ok) {
      const err = await sponsorRes.json();
      throw new Error(`Sponsor API failed: ${err.error}`);
    }
    const { txBytes, sponsorSignature } = await sponsorRes.json();

    // 4. Execute — sponsor is both sender and gas owner, only 1 signature needed
    const digest = await submitOnChain(
      walrusBlobId, blobObjectId,
      enclaveSignature, timestampMs,
      sponsorSignature, txBytes
    );
    console.log(`Threat logged on-chain: ${digest}`);
    return;
  }

  // Fallback: local keypair signing (dev mode without enclave)
  const systemBurner = loadEnclaveKeypair();
  const reporterAddress = systemBurner.toSuiAddress();

  const { blobId: walrusBlobId, blobObjectId } = await uploadToWalrus(
    buildEvidence(maliciousPackageId, reasons, reporterAddress, nonce)
  );

  const localTimestampMs = Date.now();
  const addrBytes = Buffer.from(maliciousPackageId.replace('0x', '').padStart(64, '0'), 'hex');
  const blobBytes = Buffer.from(walrusBlobId, 'utf8');
  const tsBytes = Buffer.allocUnsafe(8);
  tsBytes.writeBigUInt64LE(BigInt(localTimestampMs));
  const rawSig = await systemBurner.sign(Buffer.concat([addrBytes, blobBytes, tsBytes]));
  const localEnclaveSignature = Buffer.from(rawSig).toString('base64');

  console.log(`Local keypair signing: ${reporterAddress.slice(0, 10)}...`);

  const sponsorRes = await fetch(`${BASE_URL}/api/sponsor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: PACKAGE_ID,
      registryId: REGISTRY_ID,
      sealPackageId: SEAL_PACKAGE_ID,
      enclaveConfigId: ENCLAVE_CONFIG_ID,
      maliciousPackageId,
      walrusBlobId,
      blobObjectId,
      enclaveSignature: localEnclaveSignature,
      timestampMs: localTimestampMs,
      sender: reporterAddress,
    }),
  });
  if (!sponsorRes.ok) {
    const err = await sponsorRes.json();
    throw new Error(`Sponsor API failed: ${err.error}`);
  }
  const { txBytes, sponsorSignature } = await sponsorRes.json();
  const txBytesUint8 = fromBase64(txBytes);
  const { signature: burnerSig } = await systemBurner.signTransaction(txBytesUint8);

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: txBytesUint8,
    signature: [burnerSig, sponsorSignature],
    options: { showEffects: true },
  });
  if (result.effects?.status?.status !== 'success') {
    throw new Error(`On-chain registration failed: ${result.effects?.status?.error}`);
  }
  console.log(`Threat logged on-chain: ${result.digest}`);}
