import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://vibeguardai.vercel.app');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xc2dc3bf5d569f8664ea28fcdccc27f16522de343091d70dbc3343214e63b6122';
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || '0x6d447256edfa7e8687eaf95324b5ac99a5969ecdaede1d6b3f8e27b14dca7ac3';

async function uploadToWalrus(content: string): Promise<string> {
  const response = await fetch(WALRUS_PUBLISHER, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: content,
  });

  if (!response.ok) throw new Error(`Walrus upload failed: ${response.status}`);

  const result = await response.json();
  const blobId = result.newlyCreated?.blobObject?.blobId ?? result.alreadyCertified?.blobId;

  if (!blobId) throw new Error('No blobId in Walrus response');
  return blobId;
}

export async function autoReportThreat(maliciousPackageId: string, reasons: string[]): Promise<void> {
  console.log(`🚨 Auto-reporting malicious package: ${maliciousPackageId}`);

  // 1. Ephemeral system burner — single-use, no stored keys
  const systemBurner = new Ed25519Keypair();
  const reporterAddress = systemBurner.toSuiAddress();

  // 2. Upload evidence to Walrus
  const evidence = JSON.stringify({
    packageId: maliciousPackageId,
    riskLevel: 'RED',
    headline: 'Automated Detection: Honeypot/Malicious Contract',
    reasons,
    reportedAt: new Date().toISOString(),
    reportedBy: 'vibeguard-automated-pipeline',
  });

  const walrusBlobId = await uploadToWalrus(evidence);
  console.log(`📦 Auto-report evidence stored on Walrus: ${walrusBlobId}`);

  // 3. Request sponsored transaction
  const sponsorRes = await fetch(`${BASE_URL}/api/sponsor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: PACKAGE_ID,
      registryId: REGISTRY_ID,
      maliciousPackageId,
      walrusBlobId,
      sender: reporterAddress,
    }),
  });

  if (!sponsorRes.ok) {
    const err = await sponsorRes.json();
    throw new Error(`Sponsor API failed: ${err.error}`);
  }

  const { txBytes, sponsorSignature } = await sponsorRes.json();

  // 4. Sign with ephemeral burner and execute
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
