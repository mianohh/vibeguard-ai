import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://vibeguardai.vercel.app');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be';

// Seal enclave contract — deployed alongside reputation_registry
const SEAL_PACKAGE_ID = '0x3727d2478d4622e276e183912f6939517603d05bf93d4e3f3f628cbccd7a2ff6';
const ENCLAVE_CONFIG_ID = '0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128';

async function uploadToWalrus(content: string): Promise<{ blobId: string; blobObjectId: string }> {
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

  console.log(`\u2705 Walrus Upload Success | Blob ID: ${blobId} | Sui-Linked Blob Object ID: ${blobObjectId}`);
  return { blobId, blobObjectId };
}

export async function autoReportThreat(maliciousPackageId: string, reasons: string[]): Promise<void> {
  console.log(`🚨 Auto-reporting malicious package: ${maliciousPackageId}`);

  // 1. Ephemeral system burner — acts as the enclave signer for this integration proof
  const systemBurner = new Ed25519Keypair();
  const reporterAddress = systemBurner.toSuiAddress();

  // 2. Structure metadata
  const metadata = {
    title: 'VibeGuard AI Threat Report',
    publisher: reporterAddress,
    category: 'Security Signal',
    timestamp: new Date().toISOString(),
  };

  const evidence = JSON.stringify({
    metadata,
    packageId: maliciousPackageId,
    riskLevel: 'RED',
    headline: 'Automated Detection: Honeypot/Malicious Contract',
    reasons,
    reportedAt: metadata.timestamp,
    reportedBy: 'vibeguard-automated-pipeline',
  });

  const { blobId: walrusBlobId, blobObjectId } = await uploadToWalrus(evidence);

  // 3. Sign the payload — mirrors what the Nautilus enclave would do.
  //    Includes timestamp_ms for freshness / replay resistance per Module 4.
  const timestampMs = Date.now();
  const addrBytes = Buffer.from(maliciousPackageId.replace('0x', '').padStart(64, '0'), 'hex');
  const blobBytes = Buffer.from(walrusBlobId, 'utf8');
  const tsBytes = Buffer.allocUnsafe(8);
  tsBytes.writeBigUInt64LE(BigInt(timestampMs));
  const msgToSign = Buffer.concat([addrBytes, blobBytes, tsBytes]);
  const { signature: enclaveSignature } = await systemBurner.signPersonalMessage(msgToSign);

  console.log(`🔏 Payload signed by ephemeral enclave keypair: ${reporterAddress.slice(0, 10)}...`);

  // 4. Request sponsored transaction
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

  // 5. Sign with ephemeral burner and execute
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

  console.log(`✅ Automated threat logged on-chain: ${result.digest}`);
}
