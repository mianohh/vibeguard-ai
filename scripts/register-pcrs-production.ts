#!/usr/bin/env tsx
/**
 * Register production AWS Nitro Enclave PCRs on-chain
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';

const SEAL_ENCLAVE_PACKAGE_ID = '0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc';
const ENCLAVE_CONFIG_OBJECT_ID = '0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502';

// Real PCRs derived from binary SHA-384 (computed on startup from running binary)
// Binary: /home/ec2-user/nautilus-server/target/release/nautilus-server
// Keypair: persistent seed from /home/ec2-user/nautilus-server/enclave-keypair.json
const PCR0 = '6b1455851c652e4f148370bd24823b6d20639f8d767900991114f153a3f5c469d50776f955538e544d2d117c6de636ef';
const PCR1 = '6f2f27e05cef1d7a7c05f5e80060b42ffc1bd8501e2b8803501f23d01ddd711ab1a68125ab8655acdef23e77ade88288';
const PCR2 = '20e060bdf0deead1828134851188446e72f071a0303f3fbe480de7e97b72ca111c2d53c142a56c9480cb7da0eaf4a5bf';
const PUBLIC_KEY = '676ae54a4abf8f8c1daef53edd64855ceb4c4f300d303d31db4845e50589529d';

async function main() {
  console.log('🔐 Registering Production PCRs On-Chain');
  console.log('========================================\n');

  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

  // Load sponsor keypair
  const sponsorKey = process.env.SPONSOR_PRIVATE_KEY;
  if (!sponsorKey) {
    throw new Error('SPONSOR_PRIVATE_KEY not set');
  }

  const keypair = Ed25519Keypair.fromSecretKey(fromBase64(sponsorKey).slice(1));
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`Sponsor Address: ${address}`);
  console.log(`PCR0: ${PCR0}`);
  console.log(`PCR1: ${PCR1}`);
  console.log(`PCR2: ${PCR2}`);
  console.log(`Public Key: ${PUBLIC_KEY}\n`);

  // Build transaction
  const tx = new Transaction();

  tx.moveCall({
    target: `${SEAL_ENCLAVE_PACKAGE_ID}::enclave::register_enclave`,
    arguments: [
      tx.object(ENCLAVE_CONFIG_OBJECT_ID),
      tx.pure.vector('u8', Array.from(Buffer.from(PCR0, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(PCR1, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(PCR2, 'hex'))),
      tx.pure.vector('u8', Array.from(Buffer.from(PUBLIC_KEY, 'hex'))),
    ],
  });

  tx.setGasBudget(10_000_000);

  console.log('Signing and executing transaction...');

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log(`\n✅ Transaction executed: ${result.digest}`);
  console.log(`View on explorer: https://suiscan.xyz/testnet/tx/${result.digest}\n`);

  if (result.events && result.events.length > 0) {
    console.log('Events emitted:');
    result.events.forEach((event) => {
      console.log(`  - ${event.type}`);
    });
  }

  console.log('\n✅ Registration complete!\n');
  console.log('Update your .env file:');
  console.log(`ENCLAVE_URL=http://98.82.186.207:3000`);
  console.log(`ENCLAVE_PUBLIC_KEY=${PUBLIC_KEY}`);
  console.log(`USE_REAL_ENCLAVE=true`);
}

main().catch(console.error);
