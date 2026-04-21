/**
 * Test Hardened LocalThreatAgent Patterns
 * 
 * Verifies the three critical detection patterns:
 * 1. Asset Drain (claim function with outgoing transfer)
 * 2. Permission Hijack (AdminCap transfer)
 * 3. Blacklisted Target (known malicious package)
 */

import { LocalThreatAgent } from '../lib/local-threat-agent';
import { EffectsSummary, RiskAnalysis } from '../types';

const agent = new LocalThreatAgent();

// Test 1: Asset Drain Pattern
console.log('\n=== Test 1: Asset Drain (Honeypot) ===');
const assetDrainEffects: EffectsSummary = {
  success: true,
  gasUsed: 1000000,
  balanceChanges: [
    { type: 'decrease', amount: '9597000000', coinType: 'Token', owner: 'you' },
    { type: 'increase', amount: '9613596280', coinType: 'Token', owner: 'another_address' }
  ],
  transfers: [
    { from: 'you', to: 'another_address', amount: '9597000000', coinType: 'Token' }
  ],
  objectChanges: [
    { type: 'mutated', objectType: 'SUI>', owner: 'another_address' }
  ],
  permissionChanges: [],
  uncertain: []
};

const assetDrainRisk: RiskAnalysis = {
  riskLevel: 'RED',
  reasons: ['Assets leave your wallet to another address'],
  confidence: 0.9
};

agent.analyze(assetDrainEffects, assetDrainRisk, 'Claim airdrop').then(result => {
  console.log('✅ Headline:', result.headline);
  console.log('✅ Action:', result.recommendedAction);
  console.log('✅ Indicators:', result.bulletPoints.slice(0, 3));
  
  if (result.headline.includes('Honeypot') || result.headline.includes('Asset')) {
    console.log('✅ PASS: Asset drain detected correctly\n');
  } else {
    console.log('❌ FAIL: Asset drain not detected\n');
  }
});

// Test 2: Permission Hijack Pattern
console.log('=== Test 2: Permission Hijack (AdminCap Transfer) ===');
const permissionHijackEffects: EffectsSummary = {
  success: true,
  gasUsed: 500000,
  balanceChanges: [],
  transfers: [
    { from: 'you', to: 'another_address', amount: '1', coinType: 'AdminCap' }
  ],
  objectChanges: [
    { type: 'mutated', objectType: '0x123::admin::AdminCap', owner: 'another_address' }
  ],
  permissionChanges: [],
  uncertain: []
};

const permissionHijackRisk: RiskAnalysis = {
  riskLevel: 'RED',
  reasons: ['High-privilege object transfer detected'],
  confidence: 0.95
};

agent.analyze(permissionHijackEffects, permissionHijackRisk, 'Transfer ownership').then(result => {
  console.log('✅ Headline:', result.headline);
  console.log('✅ Action:', result.recommendedAction);
  console.log('✅ Indicators:', result.bulletPoints.slice(0, 3));
  
  if (result.headline.includes('Permission') || result.headline.includes('Critical')) {
    console.log('✅ PASS: Permission hijack detected correctly\n');
  } else {
    console.log('❌ FAIL: Permission hijack not detected\n');
  }
});

// Test 3: Blacklisted Target Pattern
console.log('=== Test 3: Blacklisted Target (Known Malicious Package) ===');
const blacklistedEffects: EffectsSummary = {
  success: true,
  gasUsed: 800000,
  balanceChanges: [],
  transfers: [],
  objectChanges: [
    { type: 'created', objectType: '0xbad1bad1::scam::Token', owner: 'you' }
  ],
  permissionChanges: [],
  uncertain: []
};

const blacklistedRisk: RiskAnalysis = {
  riskLevel: 'RED',
  reasons: ['Interacts with blacklisted package'],
  confidence: 1.0
};

agent.analyze(blacklistedEffects, blacklistedRisk, 'Mint token').then(result => {
  console.log('✅ Headline:', result.headline);
  console.log('✅ Action:', result.recommendedAction);
  console.log('✅ Indicators:', result.bulletPoints.slice(0, 3));
  
  if (result.headline.includes('Malicious') || result.headline.includes('Blacklisted')) {
    console.log('✅ PASS: Blacklisted target detected correctly\n');
  } else {
    console.log('❌ FAIL: Blacklisted target not detected\n');
  }
});

// Test 4: Safe Transaction (Control)
console.log('=== Test 4: Safe Transaction (Control) ===');
const safeEffects: EffectsSummary = {
  success: true,
  gasUsed: 300000,
  balanceChanges: [],
  transfers: [],
  objectChanges: [
    { type: 'mutated', objectType: '0x2::coin::Coin<SUI>', owner: 'you' }
  ],
  permissionChanges: [],
  uncertain: []
};

const safeRisk: RiskAnalysis = {
  riskLevel: 'GREEN',
  reasons: ['Standard transaction'],
  confidence: 0.8
};

agent.analyze(safeEffects, safeRisk, 'Check balance').then(result => {
  console.log('✅ Headline:', result.headline);
  console.log('✅ Action:', result.recommendedAction);
  
  if (result.headline.includes('Safe') || result.recommendedAction === 'Sign') {
    console.log('✅ PASS: Safe transaction classified correctly\n');
  } else {
    console.log('❌ FAIL: Safe transaction misclassified\n');
  }
});

console.log('=== All Tests Complete ===\n');
