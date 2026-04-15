/**
 * Generate a RED risk transaction to test automated threat detection
 * 
 * This creates a transaction that:
 * 1. Transfers assets to an unknown external address (not self)
 * 2. Uses a suspicious package ID
 * 3. Triggers intent mismatch (user expects to receive, but assets leave)
 * 4. Should trigger automated on-chain threat registration
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

const API_URL = 'https://vibeguardai.vercel.app';

async function generateRedRiskTransaction() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  const userAddress = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
  
  // Suspicious external address (not the user)
  const suspiciousAddress = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  
  console.log('🔨 Building RED RISK transaction...\n');
  console.log('⚠️  This transaction will:');
  console.log('   - Transfer assets to an unknown external address');
  console.log('   - Create intent mismatch (user expects to receive, but assets leave)');
  console.log('   - Trigger automated threat detection\n');
  
  const tx = new Transaction();
  
  // Split a larger amount (10 SUI = 10,000,000,000 MIST)
  const [coin] = tx.splitCoins(tx.gas, [10_000_000_000]);
  
  // Transfer to EXTERNAL suspicious address (not self)
  tx.transferObjects([coin], suspiciousAddress);
  
  tx.setSender(userAddress);
  tx.setGasBudget(10_000_000);
  
  const txBytes = await tx.build({ client });
  const base64Tx = toBase64(txBytes);
  
  console.log('✅ RED RISK transaction built\n');
  console.log('📤 Sending to VibeGuard API...\n');
  
  // User INTENT says they expect to RECEIVE tokens (airdrop claim)
  // But transaction actually SENDS tokens to external address
  // This is a classic honeypot/phishing pattern
  const payload = {
    transactionBytes: base64Tx,
    network: 'testnet',
    userAddress: userAddress,
    userIntent: 'Claim airdrop and receive 10 SUI tokens' // INTENT MISMATCH!
  };
  
  try {
    const response = await fetch(`${API_URL}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    console.log('📊 Analysis Result:\n');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.risk?.riskLevel === 'RED') {
      console.log('\n🚨 RED RISK DETECTED!');
      console.log('🤖 Automated threat registration pipeline should trigger');
      console.log('📝 Check ReputationRegistry for new threat entry');
      console.log(`🔗 Registry: https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be`);
    } else if (result.risk?.riskLevel === 'YELLOW') {
      console.log('\n⚠️  YELLOW RISK - Suspicious but not critical');
    } else {
      console.log('\n✅ Classified as safe (unexpected - check intent mismatch logic)');
    }
    
    console.log('\n📋 cURL command to reproduce:\n');
    const curlPayload = JSON.stringify(payload).replace(/"/g, '\\"');
    console.log(`curl -X POST ${API_URL}/api/explain \\
  -H "Content-Type: application/json" \\
  -d "${curlPayload}"`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

generateRedRiskTransaction().catch(console.error);
