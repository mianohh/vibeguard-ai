/**
 * nautilus-local-sim.ts
 *
 * Local simulation of an AWS Nitro Enclave for VibeGuard Module 4.
 *
 * In production, a real Nitro Enclave would:
 *   1. Boot and generate an Ed25519 keypair in isolated memory
 *   2. Produce a signed attestation document containing PCR0/1/2 measurements
 *   3. Expose an endpoint to register those PCRs on-chain
 *
 * This script replicates that flow locally using deterministic mock PCRs
 * (matching the values in seal-setup.ts) and calls register_enclave() on
 * Sui Testnet — flipping EnclaveConfig.is_registered to true so that all
 * subsequent verify_and_report() calls enforce real Ed25519 verification
 * and emit verified: true.
 *
 * Usage:
 *   SPONSOR_PRIVATE_KEY=<base64_key> npx ts-node scripts/nautilus-local-sim.ts
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import * as fs from 'fs';
import * as path from 'path';
// Load .env manually — avoids dotenv dependency
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

// ============================================================================
// Config
// ============================================================================

const SEAL_PACKAGE_ID = '0x3727d2478d4622e276e183912f6939517603d05bf93d4e3f3f628cbccd7a2ff6';
const ENCLAVE_CONFIG_ID = '0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128';

// Deterministic mock PCRs — match seal-setup.ts so Seal policy stays consistent
const PCR0 = Array(48).fill(0xaa); // enclave image measurement
const PCR1 = Array(48).fill(0xbb); // kernel + boot ramdisk
const PCR2 = Array(48).fill(0xcc); // application measurement

const ENCLAVE_KEYPAIR_FILE = path.resolve(__dirname, 'enclave-keypair.json');

// ============================================================================
// Enclave keypair — stable across runs (simulates key generated at enclave boot)
// ============================================================================

function loadOrCreateEnclaveKeypair(): Ed25519Keypair {
  if (fs.existsSync(ENCLAVE_KEYPAIR_FILE)) {
    const saved = JSON.parse(fs.readFileSync(ENCLAVE_KEYPAIR_FILE, 'utf8'));
    const raw = Buffer.from(saved.privateKeyBase64, 'base64');
    const secretKey = raw.length === 33 ? raw.slice(1) : raw;
    console.log('🔑 Loaded existing enclave keypair from enclave-keypair.json');
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  const keypair = new Ed25519Keypair();
  const privateKeyBytes = (keypair as any).keypair.secretKey as Uint8Array;
  fs.writeFileSync(ENCLAVE_KEYPAIR_FILE, JSON.stringify({
    privateKeyBase64: Buffer.from(privateKeyBytes.slice(0, 32)).toString('base64'),
    publicKeyHex: Buffer.from(keypair.getPublicKey().toRawBytes()).toString('hex'),
    suiAddress: keypair.toSuiAddress(),
    note: 'Simulated Nautilus enclave keypair — private key never leaves enclave memory in production',
  }, null, 2));

  console.log('🔑 Generated new enclave keypair → saved to enclave-keypair.json');
  return keypair;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const sponsorPrivateKeyB64 = process.env.SPONSOR_PRIVATE_KEY;
  if (!sponsorPrivateKeyB64) {
    throw new Error('SPONSOR_PRIVATE_KEY not set in .env');
  }

  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

  // Load sponsor wallet (pays gas)
  const rawKey = fromBase64(sponsorPrivateKeyB64);
  const secretKey = rawKey.length === 33 ? rawKey.slice(1) : rawKey;
  const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
  console.log(`💰 Sponsor wallet: ${sponsorKeypair.toSuiAddress()}`);

  // Load/create stable enclave keypair
  const enclaveKeypair = loadOrCreateEnclaveKeypair();
  const enclavePublicKey = Array.from(enclaveKeypair.getPublicKey().toRawBytes());
  console.log(`🖥️  Enclave public key: 0x${Buffer.from(enclavePublicKey).toString('hex')}`);
  console.log(`📍 Enclave Sui address: ${enclaveKeypair.toSuiAddress()}`);

  // Check current EnclaveConfig state
  const configObj = await suiClient.getObject({
    id: ENCLAVE_CONFIG_ID,
    options: { showContent: true },
  });

  const fields = (configObj.data?.content as any)?.fields;
  if (fields?.is_registered === true) {
    console.log('\n✅ EnclaveConfig is already registered on-chain.');
    console.log('   is_registered: true — verify_and_report() will emit verified: true');
    console.log(`   EnclaveConfig: https://suiscan.xyz/testnet/object/${ENCLAVE_CONFIG_ID}`);
    return;
  }

  console.log('\n📡 EnclaveConfig not yet registered. Calling register_enclave()...');

  // Build register_enclave() transaction
  const tx = new Transaction();
  tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::enclave::register_enclave`,
    arguments: [
      tx.object(ENCLAVE_CONFIG_ID),
      tx.pure.vector('u8', PCR0),
      tx.pure.vector('u8', PCR1),
      tx.pure.vector('u8', PCR2),
      tx.pure.vector('u8', enclavePublicKey),
    ],
  });

  tx.setSender(sponsorKeypair.toSuiAddress());
  tx.setGasBudget(10_000_000);

  const builtTx = await tx.build({ client: suiClient });
  const { signature } = await sponsorKeypair.signTransaction(builtTx);

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: builtTx,
    signature,
    options: { showEffects: true, showEvents: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`register_enclave() failed: ${result.effects?.status?.error}`);
  }

  console.log('\n✅ register_enclave() SUCCESS');
  console.log(`   Tx digest: ${result.digest}`);
  console.log(`   Explorer:  https://suiscan.xyz/testnet/tx/${result.digest}`);
  console.log(`   EnclaveConfig: https://suiscan.xyz/testnet/object/${ENCLAVE_CONFIG_ID}`);
  console.log('\n🎯 EnclaveConfig.is_registered = true');
  console.log('   All future verify_and_report() calls will enforce Ed25519 verification');
  console.log('   and emit ThreatVerified { verified: true }');

  // Save registration proof
  const proof = {
    registrationTx: result.digest,
    enclaveConfigId: ENCLAVE_CONFIG_ID,
    sealPackageId: SEAL_PACKAGE_ID,
    enclavePublicKeyHex: Buffer.from(enclavePublicKey).toString('hex'),
    pcr0: Buffer.from(PCR0).toString('hex'),
    pcr1: Buffer.from(PCR1).toString('hex'),
    pcr2: Buffer.from(PCR2).toString('hex'),
    registeredAt: new Date().toISOString(),
    explorerLink: `https://suiscan.xyz/testnet/tx/${result.digest}`,
  };

  fs.writeFileSync(
    path.resolve(__dirname, 'enclave-registration-proof.json'),
    JSON.stringify(proof, null, 2)
  );
  console.log('\n📄 Registration proof saved to scripts/enclave-registration-proof.json');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
