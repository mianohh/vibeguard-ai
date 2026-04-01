/**
 * nautilus-e2e-test.ts
 *
 * Full end-to-end workflow test for the VibeGuard Nautilus verified compute pipeline.
 *
 * Tests all 5 steps:
 *   Step 1 — Confirm EnclaveConfig.is_registered = true on-chain
 *   Step 2 — Load registered enclave keypair (simulates enclave memory)
 *   Step 3 — Upload threat evidence to Walrus
 *   Step 4 — Sign payload (malicious_package_id + walrus_blob_id + timestamp_ms)
 *   Step 5 — Execute atomic tx: verify_and_report() + report_malicious_contract()
 *             Confirm ThreatVerified { verified: true } in emitted events
 *
 * Usage:
 *   npx tsx scripts/nautilus-e2e-test.ts
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

// ============================================================================
// Constants
// ============================================================================

const SEAL_PACKAGE_ID   = '0x3727d2478d4622e276e183912f6939517603d05bf93d4e3f3f628cbccd7a2ff6';
const ENCLAVE_CONFIG_ID = '0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128';
const REGISTRY_PACKAGE  = '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';
const REGISTRY_ID       = '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be';
const WALRUS_PUBLISHER  = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5';
const SUI_CLOCK         = '0x6';

// Test target — known honeypot package for e2e testing
const TEST_MALICIOUS_PACKAGE = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

// ============================================================================
// Helpers
// ============================================================================

function loadEnclaveKeypair(): Ed25519Keypair {
  const f = path.resolve(__dirname, 'enclave-keypair.json');
  if (!fs.existsSync(f)) throw new Error('enclave-keypair.json not found — run nautilus-local-sim.ts first');
  const saved = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Ed25519Keypair.fromSecretKey(Buffer.from(saved.privateKeyBase64, 'base64'));
}

function loadSponsorKeypair(): Ed25519Keypair {
  const b64 = process.env.SPONSOR_PRIVATE_KEY;
  if (!b64) throw new Error('SPONSOR_PRIVATE_KEY not set in .env');
  const raw = fromBase64(b64);
  return Ed25519Keypair.fromSecretKey(raw.length === 33 ? raw.slice(1) : raw);
}

async function uploadToWalrus(content: string): Promise<{ blobId: string; blobObjectId: string }> {
  const res = await fetch(WALRUS_PUBLISHER, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: content,
  });
  if (!res.ok) throw new Error(`Walrus upload failed: ${res.status} ${await res.text()}`);
  const r = await res.json();
  const blobId = r.newlyCreated?.blobObject?.blobId ?? r.alreadyCertified?.blobId;
  const blobObjectId = r.newlyCreated?.blobObject?.id ?? r.alreadyCertified?.blobObject?.id ?? blobId;
  if (!blobId) throw new Error('No blobId in Walrus response');
  return { blobId, blobObjectId };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VibeGuard AI — Nautilus Verified Compute E2E Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const sponsorKeypair = loadSponsorKeypair();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Confirm EnclaveConfig.is_registered = true
  // ─────────────────────────────────────────────────────────────────────────
  console.log('STEP 1 — Verifying on-chain EnclaveConfig state...');
  const configObj = await suiClient.getObject({
    id: ENCLAVE_CONFIG_ID,
    options: { showContent: true },
  });
  const fields = (configObj.data?.content as any)?.fields;
  if (!fields?.is_registered) {
    throw new Error('EnclaveConfig.is_registered = false — run nautilus-local-sim.ts first');
  }
  const onChainPubKey = Buffer.from(fields.enclave_public_key).toString('hex');
  console.log(`  ✅ is_registered: true`);
  console.log(`  ✅ enclave_public_key: 0x${onChainPubKey.slice(0, 16)}...`);
  console.log(`  ✅ pcr0 length: ${fields.pcr0?.length} bytes\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Load enclave keypair — simulates key in enclave isolated memory
  // ─────────────────────────────────────────────────────────────────────────
  console.log('STEP 2 — Loading registered enclave keypair...');
  const enclaveKeypair = loadEnclaveKeypair();
  const enclavePublicKeyHex = Buffer.from(enclaveKeypair.getPublicKey().toRawBytes()).toString('hex');

  // Verify keypair matches what's registered on-chain
  if (enclavePublicKeyHex !== onChainPubKey) {
    throw new Error(
      `Keypair mismatch!\n  local:    0x${enclavePublicKeyHex}\n  on-chain: 0x${onChainPubKey}`
    );
  }
  console.log(`  ✅ Keypair matches on-chain EnclaveConfig`);
  console.log(`  ✅ Enclave address: ${enclaveKeypair.toSuiAddress()}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Upload threat evidence to Walrus
  // ─────────────────────────────────────────────────────────────────────────
  console.log('STEP 3 — Uploading threat evidence to Walrus...');
  const evidence = JSON.stringify({
    title: 'VibeGuard AI — Nautilus E2E Test Report',
    packageId: TEST_MALICIOUS_PACKAGE,
    riskLevel: 'RED',
    headline: 'Nautilus E2E Test: Verified Compute Pipeline',
    reasons: [
      'Intent mismatch: user expected to receive tokens, simulation shows drain',
      'Honeypot pattern detected in Move bytecode',
    ],
    enclavePublicKey: `0x${enclavePublicKeyHex}`,
    reportedAt: new Date().toISOString(),
    reportedBy: 'vibeguard-nautilus-e2e-test',
  });

  const { blobId: walrusBlobId, blobObjectId } = await uploadToWalrus(evidence);
  console.log(`  ✅ Walrus blob ID:        ${walrusBlobId}`);
  console.log(`  ✅ Walrus blob object ID: ${blobObjectId}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Sign payload inside the enclave
  //         Message = malicious_package_id bytes + walrus_blob_id bytes + timestamp LE64
  // ─────────────────────────────────────────────────────────────────────────
  console.log('STEP 4 — Enclave signing threat payload...');
  const timestampMs = Date.now();
  const addrBytes = Buffer.from(TEST_MALICIOUS_PACKAGE.replace('0x', '').padStart(64, '0'), 'hex');
  const blobBytes = Buffer.from(walrusBlobId, 'utf8');
  const tsBytes   = Buffer.allocUnsafe(8);
  tsBytes.writeBigUInt64LE(BigInt(timestampMs));
  const msgToSign = Buffer.concat([addrBytes, blobBytes, tsBytes]);

  // Use .sign() for raw Ed25519 — Move's ed25519_verify expects raw 64-byte sig, no prefix
  const rawSig = await enclaveKeypair.sign(msgToSign);
  const sigBytes = Array.from(rawSig);

  console.log(`  ✅ Message length: ${msgToSign.length} bytes`);
  console.log(`  ✅ Signature (first 16 bytes): ${Buffer.from(sigBytes.slice(0, 16)).toString('hex')}...`);
  console.log(`  ✅ Timestamp: ${timestampMs} (${new Date(timestampMs).toISOString()})\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Execute atomic transaction
  //         Call 1: seal_enclave::verify_and_report  → ThreatVerified { verified: true }
  //         Call 2: registry::report_malicious_contract → ThreatReported
  // ─────────────────────────────────────────────────────────────────────────
  console.log('STEP 5 — Executing atomic on-chain transaction...');
  const tx = new Transaction();

  tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::enclave::verify_and_report`,
    arguments: [
      tx.object(ENCLAVE_CONFIG_ID),
      tx.pure.address(TEST_MALICIOUS_PACKAGE),
      tx.pure.string(walrusBlobId),
      tx.pure.vector('u8', sigBytes),
      tx.pure.u64(timestampMs),
      tx.object(SUI_CLOCK),
    ],
  });

  tx.moveCall({
    target: `${REGISTRY_PACKAGE}::registry::report_malicious_contract`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(TEST_MALICIOUS_PACKAGE),
      tx.pure.string(walrusBlobId),
      tx.pure.address(blobObjectId),
    ],
  });

  tx.setSender(enclaveKeypair.toSuiAddress());
  tx.setGasOwner(sponsorKeypair.toSuiAddress());
  tx.setGasBudget(10_000_000);

  const builtTx = await tx.build({ client: suiClient });
  const { signature: enclaveSig }  = await enclaveKeypair.signTransaction(builtTx);
  const { signature: sponsorSig }  = await sponsorKeypair.signTransaction(builtTx);

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: builtTx,
    signature: [enclaveSig, sponsorSig],
    options: { showEffects: true, showEvents: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Results
  // ─────────────────────────────────────────────────────────────────────────
  const events = result.events ?? [];
  const threatVerified = events.find((e: any) => e.type?.includes('ThreatVerified'));
  const threatReported = events.find((e: any) => e.type?.includes('ThreatReported'));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  Tx digest:   ${result.digest}`);
  console.log(`  Explorer:    https://suiscan.xyz/testnet/tx/${result.digest}\n`);

  if (threatVerified) {
    const ev = threatVerified.parsedJson as any;
    console.log('  ThreatVerified event:');
    console.log(`    verified:            ${ev.verified}`);
    console.log(`    enclave_signer:      ${ev.enclave_signer}`);
    console.log(`    malicious_package:   ${ev.malicious_package_id}`);
    console.log(`    walrus_blob_id:      ${ev.walrus_blob_id}`);
    console.log(`    timestamp_ms:        ${ev.timestamp_ms}`);

    if (ev.verified === true) {
      console.log('\n  ✅ verified: true — Full Nautilus pipeline confirmed!');
      console.log('     Ed25519 signature verified on-chain against registered enclave public key.');
    } else {
      console.log('\n  ⚠️  verified: false — check enclave keypair matches EnclaveConfig');
    }
  } else {
    console.log('  ⚠️  ThreatVerified event not found in tx events');
  }

  if (threatReported) {
    console.log('\n  ✅ ThreatReported event emitted — threat committed to ReputationRegistry');
  }

  // Save proof
  const proof = {
    e2eTestTx: result.digest,
    explorerLink: `https://suiscan.xyz/testnet/tx/${result.digest}`,
    enclaveConfigId: ENCLAVE_CONFIG_ID,
    walrusBlobId,
    blobObjectId,
    timestampMs,
    verified: (threatVerified?.parsedJson as any)?.verified ?? false,
    testedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.resolve(__dirname, 'nautilus-e2e-proof.json'), JSON.stringify(proof, null, 2));
  console.log('\n  📄 Proof saved to scripts/nautilus-e2e-proof.json');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('\n❌ E2E test failed:', e.message);
  process.exit(1);
});
