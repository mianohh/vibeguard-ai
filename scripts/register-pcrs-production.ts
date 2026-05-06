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

// Production PCRs from AWS Nitro Enclave
const PCR0 = '19e088b0fdbc7b4e0931a4daa900269310c500aa1fff82ae866fda102dc45475a9aeb7130cdb0a3c6dd25000143be358';
const PCR1 = '19e088b0fdbc7b4e0931a4daa900269310c500aa1fff82ae866fda102dc45475a9aeb7130cdb0a3c6dd25000143be358';
const PCR2 = '21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c10edb30948c90ba67310f7b964fc500a';
const PUBLIC_KEY = 'ac465f655403fdf57e7426f61ba49ec3ceda0ad4d844848f25f391472d6da915';

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
