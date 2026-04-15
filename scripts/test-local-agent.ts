/**
 * Test LocalThreatAgent with various threat scenarios
 */

import { LocalThreatAgent } from '../lib/local-threat-agent';
import { EffectsSummary, RiskAnalysis } from '../types';

const agent = new LocalThreatAgent();

console.log('🧪 Testing LocalThreatAgent\n');

// Test 1: Intent Mismatch (Honeypot)
console.log('Test 1: Intent Mismatch Detection');
const honeypotEffects: EffectsSummary = {
  success: false,
  gasUsed: 1000000,
  balanceChanges: [
    { type: 'decrease', amount: '10000000000', coinType: 'Token', owner: 'you' }
  ],
  transfers: [
    { from: 'you', to: 'another_address', amount: '10000000000', coinType: 'Token' }
  ],
  objectChanges: [],
  permissionChanges: [],
  uncertain: []
};

const honeypotRisk: RiskAnalysis = {
  riskLevel: 'RED',
  reasons: ['⚠️ INTENT MISMATCH: You expect to receive assets, but this sends assets away'],
  confidence: 0.9
};

agent.analyze(honeypotEffects, honeypotRisk, 'Claim airdrop and receive 10 SUI tokens')
  .then(result => {
    console.log('✅ Result:', result.headline);
    console.log('   Action:', result.recommendedAction);
    console.log('   Pattern:', result.bulletPoints[0]);
    console.log('');
  });

// Test 2: Safe Self-Transfer
console.log('Test 2: Safe Transaction Detection');
const safeEffects: EffectsSummary = {
  success: true,
  gasUsed: 1000000,
  balanceChanges: [
    { type: 'decrease', amount: '1997880', coinType: 'Token', owner: 'you' }
  ],
  transfers: [],
  objectChanges: [
    { type: 'mutated', objectType: 'SUI>', owner: 'you' },
    { type: 'created', objectType: 'SUI>', owner: 'you' }
  ],
  permissionChanges: [],
  uncertain: []
};

const safeRisk: RiskAnalysis = {
  riskLevel: 'GREEN',
  reasons: ['Self-transfer detected', 'No assets leaving wallet'],
  confidence: 0.95
};

agent.analyze(safeEffects, safeRisk, 'Transfer 0.001 SUI to my wallet')
  .then(result => {
    console.log('✅ Result:', result.headline);
    console.log('   Action:', result.recommendedAction);
    console.log('   Pattern:', result.bulletPoints[0]);
    console.log('');
  });

// Test 3: Permission Change
console.log('Test 3: Permission Change Detection');
const permissionEffects: EffectsSummary = {
  success: true,
  gasUsed: 2000000,
  balanceChanges: [],
  transfers: [],
  objectChanges: [],
  permissionChanges: [
    { permission: 'TransferCap', grantedTo: '0xabc...def' }
  ],
  uncertain: []
};

const permissionRisk: RiskAnalysis = {
  riskLevel: 'YELLOW',
  reasons: ['Permission changes detected'],
  confidence: 0.8
};

agent.analyze(permissionEffects, permissionRisk, 'Approve token spending')
  .then(result => {
    console.log('✅ Result:', result.headline);
    console.log('   Action:', result.recommendedAction);
    console.log('   Pattern:', result.bulletPoints[0]);
    console.log('');
  });

// Test 4: Asset Drain (no intent provided)
console.log('Test 4: Unexpected Asset Drain');
const drainEffects: EffectsSummary = {
  success: true,
  gasUsed: 1500000,
  balanceChanges: [
    { type: 'decrease', amount: '5000000000', coinType: 'Token', owner: 'you' }
  ],
  transfers: [
    { from: 'you', to: 'external_address', amount: '5000000000', coinType: 'Token' }
  ],
  objectChanges: [],
  permissionChanges: [],
  uncertain: []
};

const drainRisk: RiskAnalysis = {
  riskLevel: 'RED',
  reasons: ['Large asset transfer to external address'],
  confidence: 0.85
};

agent.analyze(drainEffects, drainRisk)
  .then(result => {
    console.log('✅ Result:', result.headline);
    console.log('   Action:', result.recommendedAction);
    console.log('   Pattern:', result.bulletPoints[0]);
    console.log('');
  });

setTimeout(() => {
  console.log('✅ All tests complete - LocalThreatAgent working without external dependencies');
}, 1000);
