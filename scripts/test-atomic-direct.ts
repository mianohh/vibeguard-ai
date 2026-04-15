/**
 * test-atomic-direct.ts
 * 
 * Directly tests the atomic verification by calling autoReportThreat
 * This bypasses transaction parsing and directly triggers:
 * 1. Walrus evidence upload
 * 2. Enclave signature generation
 * 3. Atomic on-chain verification (verify_and_report + report_malicious_contract)
 */

import { autoReportThreat } from '../lib/auto-reporter';

async function main() {
  console.log('🧪 Direct Atomic Verification Test');
  console.log('===================================\n');

  // Generate a test malicious package ID
  const maliciousPackageId = '0x' + 'dead'.repeat(16);
  const reasons = [
    'Intent mismatch detected: User expects to receive tokens but transaction sends them',
    'Unexpected outbound transfer to external address',
    'High-value asset drain detected',
    'Honeypot pattern identified'
  ];

  console.log('Step 1: Triggering auto-report...');
  console.log('  Malicious Package:', maliciousPackageId);
  console.log('  Reasons:', reasons.length, 'threat indicators');
  console.log('');

  console.log('Step 2: Executing atomic verification flow...');
  console.log('  → Uploading evidence to Walrus...');
  
  try {
    await autoReportThreat(maliciousPackageId, reasons);
    
    console.log('');
    console.log('===================================');
    console.log('✅ Atomic Verification Complete!\n');
    console.log('What happened:');
    console.log('  1. Evidence uploaded to Walrus (immutable storage)');
    console.log('  2. Payload signed by enclave keypair');
    console.log('  3. Atomic transaction submitted with 2 Move calls:');
    console.log('     • seal_enclave::verify_and_report()');
    console.log('       - Verified Ed25519 signature');
    console.log('       - Checked timestamp freshness');
    console.log('       - Emitted ThreatVerified event');
    console.log('     • reputation_registry::report_malicious_contract()');
    console.log('       - Registered threat in on-chain registry');
    console.log('       - Emitted ThreatReported event');
    console.log('  4. Transaction confirmed on-chain');
    console.log('');
    console.log('Next Steps:');
    console.log('  • Check transaction digest on Suiscan');
    console.log('  • Query /api/threats to see new entry');
    console.log('  • Verify events emitted correctly');
    console.log('');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Atomic verification failed:', error.message);
    console.error('');
    console.error('Possible causes:');
    console.error('  • Enclave keypair not found (check scripts/enclave-keypair.json)');
    console.error('  • Walrus publisher unavailable');
    console.error('  • Sponsor API failed');
    console.error('  • On-chain verification failed');
    console.error('');
    process.exit(1);
  }
}

main();
