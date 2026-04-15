/**
 * Generate a live transaction and trigger full VibeGuard analysis + on-chain reporting
 * 
 * This script:
 * 1. Creates a fresh transaction with current on-chain state
 * 2. Sends it to the VibeGuard API for analysis
 * 3. If RED risk detected, triggers automated on-chain threat registration
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

const API_URL = 'https://vibeguardai.vercel.app';

async function generateAndAnalyzeTransaction() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  // Use a real testnet address
  const userAddress = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
  
  console.log('🔨 Building fresh transaction...\n');
  
  // Create a simple transaction that will simulate successfully
  const tx = new Transaction();
  
  // Split 0.001 SUI from gas
  const [coin] = tx.splitCoins(tx.gas, [1_000_000]); // 0.001 SUI in MIST
  
  // Transfer to self (safe transaction)
  tx.transferObjects([coin], userAddress);
  
  tx.setSender(userAddress);
  tx.setGasBudget(5_000_000);
  
  const txBytes = await tx.build({ client });
  const base64Tx = toBase64(txBytes);
  
  console.log('✅ Transaction built successfully\n');
  console.log('📤 Sending to VibeGuard API for analysis...\n');
  
  const payload = {
    transactionBytes: base64Tx,
    network: 'testnet',
    userAddress: userAddress,
    userIntent: 'Transfer 0.001 SUI to my wallet'
  };
  
  try {
    const response = await fetch(`${API_URL}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Analysis Complete:\n');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.risk?.riskLevel === 'RED') {
        console.log('\n🚨 RED RISK DETECTED - Automated on-chain reporting triggered');
        console.log('Check ReputationRegistry for new threat entry');
      } else if (result.risk?.riskLevel === 'GREEN') {
        console.log('\n✅ Transaction is SAFE');
      }
    } else {
      console.log('⚠️  API Response:\n');
      console.log(JSON.stringify(result, null, 2));
    }
    
    console.log('\n📋 cURL command for manual testing:\n');
    console.log(`curl -X POST ${API_URL}/api/explain \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

generateAndAnalyzeTransaction().catch(console.error);
