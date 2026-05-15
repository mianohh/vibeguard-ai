#!/usr/bin/env tsx
/**
 * VibeGuard Enclave — Adversarial Threat Pattern Test Suite
 *
 * Validates the production AWS Nitro Enclave threat engine against
 * known attack patterns. Each test case asserts the expected risk level
 * and required detection flags.
 *
 * Usage:
 *   npx tsx scripts/test-adversarial-patterns.ts
 *   ENCLAVE_URL=http://... npx tsx scripts/test-adversarial-patterns.ts
 *
 * Exit codes:
 *   0 — All tests passed
 *   1 — One or more tests failed
 */

const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://98.82.186.207:3000';
const REQUEST_TIMEOUT_MS = 10_000;

type RiskLevel = 'RED' | 'YELLOW' | 'GREEN';

interface AssetFlow {
  asset_type: string;
  direction: 'IN' | 'OUT';
  amount: number;
  sender: string | null;
  recipient: string | null;
}

interface MoveCall {
  package: string;
  module: string;
  function: string;
}

interface TestCase {
  name: string;
  description: string;
  userIntent: string;
  userAddress: string;
  assetFlows: AssetFlow[];
  moveCalls: MoveCall[];
  gasBudget: number;
  expectedRisk: RiskLevel;
  expectedFlags: string[];
}

const USER = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

const TEST_CASES: TestCase[] = [
  {
    name: 'Multi-Hop Asset Drain',
    description: 'Assets split across 4 unique recipients — classic multi-hop drain',
    userIntent: 'Swap tokens',
    userAddress: USER,
    assetFlows: ['0xaaaa', '0xbbbb', '0xcccc', '0xdddd'].map(recipient => ({
      asset_type: '0x2::sui::SUI',
      direction: 'OUT',
      amount: 1_000_000_000,
      sender: USER,
      recipient: recipient.padEnd(66, '0'),
    })),
    moveCalls: [{
      package: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      module: 'router',
      function: 'swap',
    }],
    gasBudget: 10_000_000,
    expectedRisk: 'RED',
    expectedFlags: ['MULTI_RECIPIENT_DRAIN'],
  },
  {
    name: 'Obfuscated Honeypot — Fake Airdrop',
    description: 'User expects inflow; simulation shows full outflow to attacker',
    userIntent: 'Claim airdrop',
    userAddress: USER,
    assetFlows: [{
      asset_type: '0x2::sui::SUI',
      direction: 'OUT',
      amount: 5_000_000_000,
      sender: USER,
      recipient: '0xattacker1111111111111111111111111111111111111111111111111111111111',
    }],
    moveCalls: [{
      package: '0xfakeairdrop1111111111111111111111111111111111111111111111111111',
      module: 'claim',
      function: 'get_tokens',
    }],
    gasBudget: 10_000_000,
    expectedRisk: 'RED',
    expectedFlags: ['INTENT_MISMATCH_HONEYPOT', 'UNEXPECTED_OUTFLOW'],
  },
  {
    name: 'Drain Function — transfer_all',
    description: 'NFT mint contract calls transfer_all — explicit drain function',
    userIntent: 'Mint NFT',
    userAddress: USER,
    assetFlows: [{
      asset_type: '0x2::sui::SUI',
      direction: 'OUT',
      amount: 100_000_000,
      sender: USER,
      recipient: '0xnftscam1111111111111111111111111111111111111111111111111111111111',
    }],
    moveCalls: [{
      package: '0xnftscam1111111111111111111111111111111111111111111111111111111111',
      module: 'collection',
      function: 'transfer_all',
    }],
    gasBudget: 10_000_000,
    expectedRisk: 'RED',
    expectedFlags: ['DRAIN_FUNCTION'],
  },
  {
    name: 'Phishing — approve_all Disguised as Wallet Connect',
    description: 'Requests blanket approval under the guise of wallet connection',
    userIntent: 'Connect wallet',
    userAddress: USER,
    assetFlows: [],
    moveCalls: [{
      package: '0xfakewallet11111111111111111111111111111111111111111111111111111111',
      module: 'auth',
      function: 'approve_all',
    }],
    gasBudget: 10_000_000,
    expectedRisk: 'RED',
    expectedFlags: ['DRAIN_FUNCTION'],
  },
  {
    name: 'Gas Budget Manipulation',
    description: '600M MIST gas budget on a simple transfer — anomalous complexity signal',
    userIntent: 'Send tokens',
    userAddress: USER,
    assetFlows: [{
      asset_type: '0x2::sui::SUI',
      direction: 'OUT',
      amount: 100_000_000,
      sender: USER,
      recipient: '0x5555555555555555555555555555555555555555555555555555555555555555',
    }],
    moveCalls: [{
      package: '0x2',
      module: 'transfer',
      function: 'public_transfer',
    }],
    gasBudget: 600_000_000,
    expectedRisk: 'YELLOW',
    expectedFlags: ['HIGH_GAS_BUDGET'],
  },
  {
    name: 'Legitimate DeFi Swap — DeepBook',
    description: 'Standard SUI/USDC swap on DeepBook — should pass clean',
    userIntent: 'Swap SUI for USDC',
    userAddress: USER,
    assetFlows: [
      {
        asset_type: '0x2::sui::SUI',
        direction: 'OUT',
        amount: 1_000_000_000,
        sender: USER,
        recipient: '0xdee9',
      },
      {
        asset_type: '0xusdc::usdc::USDC',
        direction: 'IN',
        amount: 1_500_000,
        sender: '0xdee9',
        recipient: USER,
      },
    ],
    moveCalls: [{
      package: '0xdee9',
      module: 'clob_v2',
      function: 'swap_exact_base_for_quote',
    }],
    gasBudget: 10_000_000,
    expectedRisk: 'GREEN',
    expectedFlags: [],
  },
];

function buildPayload(tc: TestCase) {
  return {
    payload: {
      transaction_bytes: 'AAACAA==',
      user_intent: tc.userIntent,
      user_address: tc.userAddress,
      network: 'testnet',
      simulation_result: {
        asset_flows: tc.assetFlows,
        move_calls: tc.moveCalls,
        gas_budget: tc.gasBudget,
      },
    },
  };
}

interface TestOutcome {
  passed: boolean;
  riskLevel: string;
  flags: string[];
  error?: string;
}

async function runTest(tc: TestCase): Promise<TestOutcome> {
  try {
    const res = await fetch(`${ENCLAVE_URL}/process_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(tc)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { passed: false, riskLevel: 'N/A', flags: [], error: `HTTP ${res.status}` };
    }

    const data = await res.json() as any;
    const riskLevel: string = data.response?.risk_level ?? 'N/A';
    const flags: string[] = data.response?.flags ?? [];

    if (riskLevel !== tc.expectedRisk) {
      return {
        passed: false,
        riskLevel,
        flags,
        error: `expected ${tc.expectedRisk}, got ${riskLevel}`,
      };
    }

    const missing = tc.expectedFlags.filter(
      expected => !flags.some((f: string) => f.includes(expected))
    );

    if (missing.length > 0) {
      return {
        passed: false,
        riskLevel,
        flags,
        error: `missing flags: ${missing.join(', ')}`,
      };
    }

    return { passed: true, riskLevel, flags };
  } catch (err) {
    return { passed: false, riskLevel: 'N/A', flags: [], error: String(err) };
  }
}

async function main() {
  const sep = '─'.repeat(72);

  console.log(sep);
  console.log('  VibeGuard Production Enclave — Adversarial Threat Pattern Tests');
  console.log(sep);
  console.log(`  Endpoint   : ${ENCLAVE_URL}`);
  console.log(`  Test cases : ${TEST_CASES.length}`);
  console.log(sep);

  // Health check
  process.stdout.write('  Health check ... ');
  try {
    const res = await fetch(`${ENCLAVE_URL}/health_check`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json() as any;
    console.log(`ok  (pk: ${String(body.pk ?? '').slice(0, 16)}...)\n`);
  } catch (err) {
    console.log(`FAILED — ${err}`);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const outcome = await runTest(tc);
    const status = outcome.passed ? 'PASS' : 'FAIL';
    const flagStr = outcome.flags.length > 0 ? outcome.flags.join(', ') : 'none';

    console.log(`  [${status}] ${tc.name}`);
    console.log(`         ${tc.description}`);

    if (outcome.passed) {
      console.log(`         Risk: ${outcome.riskLevel}  |  Flags: ${flagStr}`);
    } else {
      console.log(`         Risk: ${outcome.riskLevel}  |  Flags: ${flagStr}`);
      console.log(`         Error: ${outcome.error}`);
    }

    console.log();
    outcome.passed ? passed++ : failed++;
  }

  console.log(sep);
  console.log(`  Results: ${passed} passed, ${failed} failed — ${((passed / TEST_CASES.length) * 100).toFixed(0)}% success rate`);

  if (failed === 0) {
    console.log('  Result: PASS — all adversarial patterns detected correctly');
  } else {
    console.log('  Result: FAIL — one or more detection failures');
    process.exit(1);
  }

  console.log(sep);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
