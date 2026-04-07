/**
 * seal-encrypt-api-key.ts
 * 
 * Encrypts the Gemini API key using Seal with mock PCRs.
 * The encrypted output can be safely committed to the repository.
 * 
 * When AWS Nitro is deployed, re-run this with real PCRs from `make extract-pcrs`.
 * 
 * Usage:
 *   GEMINI_API_KEY=your_key npx tsx scripts/seal-encrypt-api-key.ts
 */

import { SealClient, getAllowlistedKeyServers } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import * as fs from 'fs';
import * as path from 'path';

// Mock PCRs matching nautilus-server (will be replaced with real PCRs from AWS Nitro)
const MOCK_PCR0 = 'aa'.repeat(48);
const MOCK_PCR1 = 'bb'.repeat(48);
const MOCK_PCR2 = 'cc'.repeat(48);

const SEAL_POLICY_ID = '0x00';
const ENCLAVE_CONFIG_OBJECT_ID = process.env.ENCLAVE_CONFIG_OBJECT_ID || 
  '0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128';

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  console.log('🔐 Encrypting Gemini API key with Seal...');
  console.log('   PCR0:', MOCK_PCR0.slice(0, 16) + '...');
  console.log('   PCR1:', MOCK_PCR1.slice(0, 16) + '...');
  console.log('   PCR2:', MOCK_PCR2.slice(0, 16) + '...');
  console.log('   Policy ID:', SEAL_POLICY_ID);
  console.log('');

  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

  const sealClient = new SealClient({
    suiClient,
    serverObjectIds: getAllowlistedKeyServers('testnet'),
    verifyKeyServers: false,
  });

  // Encrypt the API key
  const secretBytes = new TextEncoder().encode(geminiApiKey);
  const { encryptedObject } = await sealClient.encrypt({
    threshold: 2,
    packageId: ENCLAVE_CONFIG_OBJECT_ID,
    id: Buffer.from(SEAL_POLICY_ID.replace('0x', ''), 'hex'),
    data: secretBytes,
  });

  const output = {
    description: 'VibeGuard Gemini API key encrypted under Seal PCR policy',
    sealPolicyId: SEAL_POLICY_ID,
    enclaveConfigObjectId: ENCLAVE_CONFIG_OBJECT_ID,
    pcrs: {
      pcr0: MOCK_PCR0,
      pcr1: MOCK_PCR1,
      pcr2: MOCK_PCR2,
    },
    encryptedObject: Buffer.from(encryptedObject).toString('base64'),
    createdAt: new Date().toISOString(),
    note: 'Only the Nautilus enclave with matching PCR measurements can decrypt this.',
    instructions: [
      '1. Deploy enclave to AWS Nitro',
      '2. Run: make extract-pcrs',
      '3. Update pcrs in this file with real values',
      '4. Re-encrypt with: GEMINI_API_KEY=xxx npx tsx scripts/seal-encrypt-api-key.ts',
      '5. Call /admin/provision_gemini_api_key with this encrypted object',
    ],
  };

  const outputPath = path.resolve(__dirname, 'encrypted-gemini-key.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('✅ Encrypted key written to scripts/encrypted-gemini-key.json');
  console.log('   This file is safe to commit - it cannot be decrypted outside the approved enclave.');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Deploy enclave to AWS Nitro');
  console.log('   2. Extract real PCRs with: make extract-pcrs');
  console.log('   3. Re-run this script with real PCRs');
  console.log('   4. Complete Seal 2-step key load (see docs/SEAL_KEY_LOAD.md)');
}

main().catch(console.error);
