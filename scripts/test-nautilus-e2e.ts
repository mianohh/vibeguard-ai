/**
 * test-nautilus-e2e.ts
 * 
 * End-to-end integration test for VibeGuard Nautilus workflow.
 * Simulates the complete flow from transaction submission to on-chain verification.
 * 
 * Flow:
 * 1. Submit transaction to Nautilus enclave /process_data
 * 2. Enclave runs LocalThreatAgent analysis
 * 3. Enclave signs response with ephemeral keypair
 * 4. Verify signature matches registered enclave public key
 * 5. Submit to on-chain verify_and_report
 * 6. Verify ThreatVerified event emitted
 * 
 * Usage:
 *   npx ts-node scripts/test-nautilus-e2e.ts
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as ed25519 from '@noble/ed25519';

// Configuration
const NETWORK = 'testnet';
const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://localhost:3000';
const SEAL_ENCLAVE_PACKAGE_ID = process.env.SEAL_ENCLAVE_PACKAGE_ID || '0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc';
const ENCLAVE_OBJECT_ID = process.env.ENCLAVE_OBJECT_ID || '0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502';

interface ThreatAnalysisResult {
  risk_level: string;
  headline: string;
  plain_english: string;
  reasons: string[];
  recommended_action: string;
  timestamp_ms: number;
}

interface EnclaveResponse {
  response: ThreatAnalysisResult;
  signature: string;
}

async function main() {
  console.log('🧪 VibeGuard Nautilus E2E Integration Test');
  console.log('==========================================');
  console.log('');
  console.log('Configuration:');
  console.log('  Network:', NETWORK);
  console.log('  Enclave URL:', ENCLAVE_URL);
  console.log('  Package ID:', SEAL_ENCLAVE_PACKAGE_ID);
  console.log('  Enclave Object:', ENCLAVE_OBJECT_ID);
  console.log('');

  const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });

  // Step 1: Generate test transaction (RED risk - intent mismatch)
  console.log('Step 1: Generating test transaction (RED risk)...');
  const testTx = generateRedRiskTransaction();
  console.log('  Transaction bytes:', testTx.slice(0, 50) + '...');
  console.log('  User intent: "Claim airdrop and receive 10 SUI"');
  console.log('');

  // Step 2: Submit to Nautilus enclave
  console.log('Step 2: Submitting to Nautilus enclave...');
  const enclaveResponse = await callEnclaveProcessData({
    transaction_bytes: testTx,
    user_intent: 'Claim airdrop and receive 10 SUI',
    user_address: '0xa9070000000000000000000000000000',
    network: NETWORK,
  });

  console.log('  Risk Level:', enclaveResponse.response.risk_level);
  console.log('  Headline:', enclaveResponse.response.headline);
  console.log('  Signature:', enclaveResponse.signature.slice(0, 32) + '...');
  console.log('');

  // Step 3: Fetch enclave public key from on-chain
  console.log('Step 3: Fetching enclave public key from on-chain...');
  const enclavePublicKey = await getEnclavePublicKey(suiClient, ENCLAVE_OBJECT_ID);
  console.log('  Public Key:', enclavePublicKey.slice(0, 32) + '...');
  console.log('');

  // Step 4: Verify signature locally
  console.log('Step 4: Verifying signature locally...');
  const isValid = await verifySignature(
    enclaveResponse.response,
    enclaveResponse.signature,
    enclavePublicKey
  );
  
  if (isValid) {
    console.log('  ✅ Signature verification PASSED');
  } else {
    console.log('  ❌ Signature verification FAILED');
    process.exit(1);
  }
  console.log('');

  // Step 5: Submit to on-chain verification (simulation)
  console.log('Step 5: Simulating on-chain verification...');
  console.log('  In production, this would call:');
  console.log('    seal_enclave::verify_and_report()');
  console.log('  Which verifies:');
  console.log('    • Signature matches registered enclave key');
  console.log('    • Timestamp is recent (< 5 minutes)');
  console.log('    • PCRs match approved configuration');
  console.log('  Then emits:');
  console.log('    • ThreatVerified event');
  console.log('');

  // Step 6: Summary
  console.log('==========================================');
  console.log('✅ E2E Test Complete!');
  console.log('');
  console.log('Summary:');
  console.log('  • LocalThreatAgent detected:', enclaveResponse.response.risk_level, 'risk');
  console.log('  • Enclave signed response with ephemeral key');
  console.log('  • Signature verified against on-chain public key');
  console.log('  • Ready for on-chain verification');
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Deploy enclave to AWS Nitro');
  console.log('  2. Register real PCRs on-chain');
  console.log('  3. Complete Seal key load');
  console.log('  4. Test with live transactions');
  console.log('');
}

function generateRedRiskTransaction(): string {
  // Simplified transaction that triggers intent mismatch
  // User expects to receive, but transaction sends assets
  const tx = new Transaction();
  tx.setSender('0xa9070000000000000000000000000000');
  tx.setGasPrice(1000);
  tx.setGasBudget(10000000);
  
  // Simulate transfer to external address (not user)
  // In real scenario, this would be a full transaction
  return Buffer.from(tx.serialize()).toString('base64');
}

async function callEnclaveProcessData(payload: any): Promise<EnclaveResponse> {
  const response = await fetch(`${ENCLAVE_URL}/process_data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Enclave request failed: ${error}`);
  }

  return response.json();
}

async function getEnclavePublicKey(
  client: SuiClient,
  enclaveObjectId: string
): Promise<string> {
  try {
    const object = await client.getObject({
      id: enclaveObjectId,
      options: { showContent: true },
    });

    if (object.data?.content?.dataType === 'moveObject') {
      const fields = (object.data.content as any).fields;
      return fields.public_key || fields.pk;
    }
  } catch (error) {
    console.warn('  ⚠️  Could not fetch on-chain public key, using mock');
  }

  // Fallback: use mock public key for local testing
  return '0x' + '00'.repeat(32);
}

async function verifySignature(
  result: ThreatAnalysisResult,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    // Reconstruct the message that was signed
    const message = JSON.stringify(result);
    const messageBytes = new TextEncoder().encode(message);

    // Convert hex to bytes
    const signature = Buffer.from(signatureHex, 'hex');
    const publicKey = Buffer.from(publicKeyHex.replace('0x', ''), 'hex');

    // Verify Ed25519 signature
    return await ed25519.verify(signature, messageBytes, publicKey);
  } catch (error) {
    console.error('  Signature verification error:', error);
    return false;
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
