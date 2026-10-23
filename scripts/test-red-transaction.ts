/**
 * test-red-transaction.ts — Full-pipeline RED threat detection test.
 *
 * Builds a REAL dangerous Sui PTB (drains 0.3 SUI from the user to an
 * attacker address) while the user's declared intent is an inflow
 * ("claim airdrop") — i.e. a transaction genuinely against user intent.
 * The tx is dry-run against live testnet (never executed), then pushed
 * through the whole detection pipeline:
 *
 *   A) local Rust nautilus-server  POST /process_data  → RED + Ed25519 sig
 *   B) app pipeline                 POST /api/explain   → RED verdict,
 *        gRPC simulation, RiskEngine, enclave call + signature verification,
 *        LocalThreatAgent explanation
 *   C) auto-report side effect      /api/flush          → REAL on-chain
 *        report_malicious_contract tx against the testnet registry
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-red-transaction.ts
 * Prereqs: Rust server on :3001 (PORT=3001 .../nautilus-server),
 *          next dev on :3100 (see report for exact env).
 */
import { Transaction } from '@mysten/sui/transactions';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { readFileSync } from 'fs';
import { makeSuiRpcAdapter, simulateTransactionRaw, graphqlQuery } from '../lib/sui-rpc';

(ed25519 as any).etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...m));

const SPONSOR = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
const ATTACKER = '0xc0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00';
const DRAIN_AMOUNT = 300_000_000n; // 0.3 SUI
const USER_INTENT = 'Claim my airdrop rewards from the VibeGuard campaign';

const RUST_URL = 'http://localhost:3001';
const APP_URL = 'http://localhost:3100';
const APP_LOG = '/tmp/opencode/next-dev-3100.log';
const RUST_LOG = '/tmp/opencode/nautilus-red-test.log';
const ENCLAVE_PUBKEY_HEX = 'ce4770a7df3dda1c84fb5e1167a566b254d552435148368c3cd7687c6258c0fb';

const results: { stage: string; ok: boolean; detail: string }[] = [];
function record(stage: string, ok: boolean, detail: string) {
  results.push({ stage, ok, detail });
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} — ${stage}: ${detail}`);
}
function die(msg: string): never {
  console.error(`\n❌ ABORT: ${msg}`);
  process.exit(1);
}

async function main() {
  console.log('━━━ [0/4] Building REAL dangerous PTB (drain 0.3 SUI vs "claim airdrop" intent) ━━━');

  const tx = new Transaction();
  tx.setSender(SPONSOR);
  tx.setGasBudget(100_000_000n); // 0.1 SUI — realistic, well under HIGH_GAS_BUDGET (500M)
  const [drainCoin] = tx.splitCoins(tx.gas, [DRAIN_AMOUNT]);
  tx.transferObjects([drainCoin], ATTACKER);

  let txBytes: string;
  try {
    const bytes = await tx.build({ client: makeSuiRpcAdapter('testnet') });
    txBytes = Buffer.from(bytes).toString('base64');
    record('build PTB', true, `built ${bytes.length} bytes, sender=${SPONSOR.slice(0, 10)}…, recipient=${ATTACKER.slice(0, 10)}… (NOT executed)`);
  } catch (e: any) {
    die(`PTB build failed: ${e.message}`);
  }

  console.log('━━━ [1/4] Real dry-run against live testnet ━━━');
  let dryRun: any;
  try {
    dryRun = await simulateTransactionRaw(txBytes, 'testnet');
    if (dryRun.effects?.status?.status !== 'success') {
      die(`dry-run did not succeed: ${JSON.stringify(dryRun.effects?.status)}`);
    }
    record('dry-run', true, `effects.status=success, digest=${dryRun.digest}`);
  } catch (e: any) {
    die(`dry-run failed: ${e.message}`);
  }

  const rawBalances: any[] = dryRun.balanceChanges || [];
  console.log('    raw balanceChanges:', JSON.stringify(rawBalances, null, 2));
  const decrease = rawBalances.find((c: any) => parseInt(c.amount) < 0);
  const increase = rawBalances.find((c: any) => parseInt(c.amount) > 0);
  const userOwner = decrease?.owner?.AddressOwner;
  const otherOwner = increase?.owner?.AddressOwner;

  if (!decrease || !increase) die('expected one OUT and one IN balance change');
  if (userOwner !== SPONSOR) die(`outflow owner form mismatch: got ${userOwner}, want ${SPONSOR}`);
  if (otherOwner !== ATTACKER) die(`inflow owner form mismatch: got ${otherOwner}, want ${ATTACKER}`);
  if (-parseInt(decrease.amount) < 1_000_000) die('outflow too small for "significant outgoing"');
  record('balance-change mapping', true, `OUT ${-parseInt(decrease.amount)} MIST from user → IN ${parseInt(increase.amount)} MIST to attacker`);

  // Mirror app/api/explain assetFlows mapping exactly
  const assetFlows = rawBalances.map((c: any) => ({
    asset_type: c.coinType || '0x2::sui::SUI',
    direction: parseInt(c.amount) < 0 ? 'OUT' : 'IN',
    amount: Math.abs(parseInt(c.amount || '0')),
    sender: parseInt(c.amount) < 0 ? (c.owner?.AddressOwner || null) : null,
    recipient: parseInt(c.amount) > 0 ? (c.owner?.AddressOwner || null) : null,
  }));
  const gasBudget = parseInt(String(Transaction.from(txBytes).getData().gasData.budget));
  const moveCalls: never[] = []; // pure transfer: no Move calls

  console.log('━━━ [2/4] Local Rust enclave: POST /process_data ━━━');
  const rustBody = {
    payload: {
      transaction_bytes: txBytes,
      user_intent: USER_INTENT,
      user_address: SPONSOR,
      network: 'testnet',
      simulation_result: { asset_flows: assetFlows, move_calls: moveCalls, gas_budget: gasBudget },
    },
  };
  let rustResp: any;
  try {
    const res = await fetch(`${RUST_URL}/process_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rustBody),
    });
    if (!res.ok) die(`/process_data HTTP ${res.status}: ${await res.text()}`);
    rustResp = await res.json();
    console.log('    response:', JSON.stringify({ ...rustResp, signature: `${rustResp.signature.slice(0, 32)}…` }, null, 2));
  } catch (e: any) {
    die(`Rust /process_data failed: ${e.message}`);
  }

  const flags: string[] = rustResp.response?.flags || [];
  const isRed = rustResp.response?.risk_level === 'RED';
  const intentFlag = flags.find((f) => f.startsWith('INTENT_MISMATCH_HONEYPOT'));
  const outflowFlag = flags.find((f) => f.startsWith('UNEXPECTED_OUTFLOW'));
  if (!isRed) die(`expected risk_level RED, got ${rustResp.response?.risk_level} (flags: ${flags.join(',') || 'none'})`);
  if (!intentFlag || !outflowFlag) die(`missing honeypot flags, got: ${flags.join(', ')}`);
  record('Rust threat analysis', true, `RED intent=${rustResp.response.intent} flags=[${flags.join(', ')}] headline="${rustResp.response.headline}"`);

  // Verify Ed25519 signature over build_signing_message = pkg32 || blob || ts_le
  const pkgHex = (rustResp.response.malicious_package_id || '0'.repeat(64)).replace(/^0x/, '');
  const pkgBytes = Buffer.alloc(32, 0);
  Buffer.from(pkgHex, 'hex').copy(pkgBytes, 0, 0, Math.min(pkgHex.length / 2, 32));
  const blobBytes = Buffer.from(rustResp.response.walrus_blob_id || '', 'utf8');
  const tsLe = Buffer.alloc(8);
  tsLe.writeBigUInt64LE(BigInt(rustResp.response.timestamp_ms));
  const message = Buffer.concat([pkgBytes, blobBytes, tsLe]);
  const sigValid = ed25519.verify(
    Buffer.from(rustResp.signature, 'hex'),
    message,
    Buffer.from(ENCLAVE_PUBKEY_HEX, 'hex'),
  );
  if (!sigValid) die('Ed25519 signature INVALID');
  record('enclave signature', true, `verified Ed25519 sig over ${message.length}-byte message with local pubkey ${ENCLAVE_PUBKEY_HEX.slice(0, 16)}…`);

  console.log('━━━ [3/4] App pipeline: POST /api/explain (full path) ━━━');
  let explain: any;
  let explainStatus = 0;
  try {
    const res = await fetch(`${APP_URL}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionBytes: txBytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: USER_INTENT,
      }),
    });
    explainStatus = res.status;
    explain = await res.json();
  } catch (e: any) {
    die(`/api/explain request failed: ${e.message}`);
  }
  if (explainStatus !== 200) die(`/api/explain HTTP ${explainStatus}: ${JSON.stringify(explain).slice(0, 500)}`);

  const risk = explain.risk || {};
  console.log('    risk:', JSON.stringify(risk, null, 2));
  console.log('    explanation:', JSON.stringify(explain.explanation, null, 2));
  const reasons: string[] = risk.reasons || [];
  const hasOutflowReason = reasons.some((r) => r.includes('leave your wallet'));
  const hasIntentReason = reasons.some((r) => r.includes('INTENT MISMATCH'));
  if (risk.riskLevel !== 'RED') die(`expected app riskLevel RED, got ${risk.riskLevel} (${reasons.join('; ')})`);
  if (!hasOutflowReason || !hasIntentReason) die(`missing RED reasons, got: ${reasons.join('; ')}`);
  record('app RiskEngine (gRPC dry-run)', true, `RED conf=${risk.confidence} reasons=[${reasons.join(' | ')}]`);

  console.log('━━━ [4/4] Enclave call + auto-report on-chain ━━━');
  await new Promise((r) => setTimeout(r, 60_000)); // flush: Walrus upload (~27s observed) + on-chain tx

  const nextLog = readFileSync(APP_LOG, 'utf8');
  const rustLog = readFileSync(RUST_LOG, 'utf8');

  const encConnected = nextLog.includes('EnclaveClient: connected to http://localhost:3001');
  const encVerified = /🔐 Enclave signature verification:[\s\S]{0,200}verified: true/.test(nextLog);
  const encFailed = nextLog.includes('Enclave signature verification FAILED') || nextLog.includes('Enclave signature failed, falling back');
  record('app → local enclave call', encConnected && encVerified && !encFailed,
    `connected=${encConnected} verified=${encVerified} failed=${encFailed}`);

  const flushSuccess = nextLog.match(/\[auto-reporter\] on-chain success digest=(\S+)/);
  const flushFail = nextLog.match(/\[auto-reporter\] (?:flush failed|flush call failed): (.*)/);
  if (flushSuccess) {
    const digest = flushSuccess[1];
    record('auto-report on-chain', true, `report_malicious_contract executed, digest=${digest}`);
    try {
      const txq = await graphqlQuery<any>(
        'query($d: String!) { transaction(digest: $d) { digest sender { address } effects { status } } }',
        { d: digest },
        'testnet',
      );
      const t = txq?.transaction;
      record('on-chain tx fetch (GraphQL)', !!t, t
        ? `digest=${t.digest} sender=${t.sender?.address} effects=${JSON.stringify(t.effects?.status ?? t.effects)}`
        : `transaction ${digest} not found`);
    } catch (e: any) {
      record('on-chain tx fetch (GraphQL)', false, `query failed (non-fatal): ${e.message}`);
    }
  } else {
    record('auto-report on-chain', false, `no success digest; flushFail=${flushFail?.[1] || 'none'} — see ${APP_LOG}`);
  }

  if (!rustLog.includes('Server ready')) record('rust server uptime', false, 'rust log missing readiness');

  console.log('\n━━━━━━━━━━ SUMMARY ━━━━━━━━━━');
  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    console.log(`${r.ok ? '✅' : '❌'} ${r.stage}`);
  }
  console.log(allOk
    ? '\n🎉 FULL PIPELINE RED TEST PASSED — dangerous tx detected end-to-end, never executed on-chain.'
    : '\n⚠️  SOME STAGES FAILED — see details above.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => die(e.stack || String(e)));
