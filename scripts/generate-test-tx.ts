/**
 * Generate fresh transaction bytes for API testing
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

async function main() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  const userAddress = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
  
  // Create a simple SUI transfer transaction
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [1000]);
  tx.transferObjects([coin], userAddress);
  
  tx.setSender(userAddress);
  tx.setGasBudget(10_000_000);
  
  const txBytes = await tx.build({ client });
  const base64Tx = toBase64(txBytes);
  
  console.log('\n✅ Fresh transaction bytes generated:\n');
  console.log(base64Tx);
  console.log('\n📋 Test with:\n');
  console.log(`curl -X POST https://vibeguardai.vercel.app/api/explain \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionBytes": "${base64Tx}",
    "network": "testnet",
    "userAddress": "${userAddress}",
    "userIntent": "Transfer 1000 SUI to my wallet"
  }'`);
}

main().catch(console.error);
