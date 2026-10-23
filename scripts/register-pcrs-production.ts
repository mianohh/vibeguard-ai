#!/usr/bin/env tsx
/**
 * register-pcrs-production.ts — Register the running enclave's PCRs + public key on-chain.
 *
 * Fetches live attestation from ENCLAVE_URL, then calls
 * seal_enclave::enclave::register_enclave() on Sui testnet.
 * Run this after every enclave redeploy (binary or key rotation).
 *
 * Usage: npx tsx --env-file=.env.local scripts/register-pcrs-production.ts
 */
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { fromBase64 } from '@mysten/sui/utils';
import { suiRpcAdapter, executeTransactionBlock } from '../lib/sui-rpc';

const SEAL_ENCLAVE_PACKAGE_ID = process.env.SEAL_ENCLAVE_PACKAGE_ID
  || '0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc';
const ENCLAVE_CONFIG_OBJECT_ID = process.env.ENCLAVE_CONFIG_OBJECT_ID
  || '0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502';
const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://92.4.140.187:3000';

async function main() {
  console.log('🔐 Registering Enclave PCRs On-Chain');
  console.log('=====================================\n');

  // ── Fetch live attestation from the running enclave ──
  console.log(`Fetching attestation from ${ENCLAVE_URL} …`);
  const attRes = await fetch(`${ENCLAVE_URL}/get_attestation`);
  if (!attRes.ok) throw new Error(`Attestation fetch failed: HTTP ${attRes.status}`);
  const att = await attRes.json() as {
    public_key: string;
    pcr0: string;
    pcr1: string;
    pcr2: string;
    provider: string;
    mode: string;
  };

  console.log(`  Public key: ${att.public_key}`);
  console.log(`  PCR0:       ${att.pcr0}`);
  console.log(`  PCR1:       ${att.pcr1}`);
  console.log(`  PCR2:       ${att.pcr2}`);
  console.log(`  Mode:       ${att.mode}\n`);

  // ── Load sponsor keypair ──
  const sponsorKey = process.env.SPONSOR_PRIVATE_KEY;
  if (!sponsorKey) throw new Error('SPONSOR_PRIVATE_KEY not set in .env.local');

  const keypair = sponsorKey.startsWith('suiprivkey')
    ? Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(sponsorKey).secretKey)
    : Ed25519Keypair.fromSecretKey(fromBase64(sponsorKey).slice(1));

  console.log(`Sponsor: ${keypair.toSuiAddress()}`);

  // ── Build + execute registration transaction ──
  const tx = new Transaction();
  tx.moveCall({
    target: `${SEAL_ENCLAVE_PACKAGE_ID}::enclave::register_enclave`,
    arguments: [
      tx.object(ENCLAVE_CONFIG_OBJECT_ID),
      tx.pure.vector('u8', Array.from(Buffer.from(att.pcr0, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(att.pcr1, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(att.pcr2, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(att.public_key, 'hex'))),
    ],
  });
  tx.setGasBudget(10_000_000);

  console.log('\nSigning and executing transaction…');
  const builtBytes = await tx.build({ client: suiRpcAdapter });
  const { signature } = await keypair.signTransaction(builtBytes);
  const result = await executeTransactionBlock({ transactionBlock: builtBytes, signature: [signature] });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Transaction failed: ${result.effects?.status?.error}`);
  }

  console.log(`\n✅ Registration complete!`);
  console.log(`   Digest: ${result.digest}`);
  console.log(`   Explorer: https://suiscan.xyz/testnet/tx/${result.digest}\n`);
  console.log('Update .env.local:');
  console.log(`   ENCLAVE_URL=${ENCLAVE_URL}`);
  console.log(`   ENCLAVE_PUBLIC_KEY=${att.public_key}`);
}

main().catch(console.error);
