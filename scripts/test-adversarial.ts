/**
 * test-adversarial.ts — Adversarial hardening suite for the VibeGuard enclave engine.
 *
 * Stages:
 *   A) payload matrix  — direct POST /process_data against the local Rust enclave:
 *      evasion cases (direction case, sender spoof, null recipients, framework
 *      spoofing), permission-grant/ice-phishing, drain-function naming, bundle
 *      abuse, amount-at-risk, gas boundaries, and false-positive guards.
 *   B) real dry-runs   — REAL testnet PTBs simulated (never executed), effects
 *      mapped into /process_data exactly like the app does.
 *   C) full pipeline   — publish move/scammock test package, then POST /api/explain
 *      on real dry-runs: honeypot (RED), honest send (YELLOW), self transfer
 *      (GREEN), real vault::drain call (RED), real vault::authorize claim
 *      (RED). RED verdicts auto-report on-chain (up to 3 registry txs).
 *   D) evidence        — enclave signature verification in app log, on-chain
 *      report digests fetched via GraphQL.
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-adversarial.ts
 * Prereqs: Rust server on :3001, next dev on :3100 (local-enclave env overrides).
 */
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { readFileSync, existsSync } from 'fs';
import { makeSuiRpcAdapter, simulateTransactionRaw, executeTransactionBlock, graphqlQuery } from '../lib/sui-rpc';

(ed25519 as any).etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...m));

const SPONSOR = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
const ATTACKER = '0xc0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00';
const ATTACKER_2 = '0xba5eba11ba5eba11ba5eba11ba5eba11ba5eba11ba5eba11ba5eba11ba5eba11';
const ATTACKER_3 = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const ATTACKER_4 = '0xfeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface';
const FRIEND = '0xf11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11ef11e';
const SCAM_PKG = `0x${'abab'.repeat(32)}`;

const RUST_URL = 'http://localhost:3001';
const APP_URL = 'http://localhost:3100';
const APP_LOG = '/tmp/opencode/next-dev-3100.log';
const RUST_LOG = '/tmp/opencode/nautilus-adv-test.log';
const ENCLAVE_PUBKEY_HEX = 'ce4770a7df3dda1c84fb5e1167a566b254d552435148368c3cd7687c6258c0fb';
const VAULT_MV = 'move/scammock/build/ScamMock/bytecode_modules/vault.mv';

const results: { stage: string; ok: boolean; detail: string }[] = [];
function record(stage: string, ok: boolean, detail: string) {
  results.push({ stage, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${stage}: ${detail}`);
}
function die(msg: string): never {
  console.error(`\nABORT: ${msg}`);
  process.exit(1);
}

function verifySig(raw: any): boolean {
  const pkgHex = (raw.response.malicious_package_id || '0'.repeat(64)).replace(/^0x/, '');
  const pkgBytes = Buffer.alloc(32, 0);
  Buffer.from(pkgHex, 'hex').copy(pkgBytes, 0, 0, Math.min(pkgHex.length / 2, 32));
  const blobBytes = Buffer.from(raw.response.walrus_blob_id || '', 'utf8');
  const tsLe = Buffer.alloc(8);
  tsLe.writeBigUInt64LE(BigInt(raw.response.timestamp_ms));
  const message = Buffer.concat([pkgBytes, blobBytes, tsLe]);
  return ed25519.verifySync
    ? ed25519.verifySync(Buffer.from(raw.signature, 'hex'), message, Buffer.from(ENCLAVE_PUBKEY_HEX, 'hex'))
    : (ed25519 as any).verify(Buffer.from(raw.signature, 'hex'), message, Buffer.from(ENCLAVE_PUBKEY_HEX, 'hex'));
}

async function callRust(body: any): Promise<any> {
  const res = await fetch(`${RUST_URL}/process_data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`/process_data HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function mkBody(opts: {
  intent: string;
  userAddress?: string;
  flows: any[];
  moveCalls?: any[];
  gasBudget?: number;
}) {
  return {
    payload: {
      transaction_bytes: Buffer.from('adversarial').toString('base64'),
      user_intent: opts.intent,
      user_address: opts.userAddress ?? SPONSOR,
      network: 'testnet',
      simulation_result: {
        asset_flows: opts.flows,
        move_calls: opts.moveCalls ?? [],
        gas_budget: opts.gasBudget ?? 100_000_000,
      },
    },
  };
}

const out = (amount: number, recipient: string | null = ATTACKER, sender: string | null = SPONSOR) => ({
  asset_type: '0x2::sui::SUI', direction: 'OUT', amount, sender, recipient,
});
const into = (amount: number, sender: string | null = ATTACKER, recipient: string | null = SPONSOR) => ({
  asset_type: '0x2::sui::SUI', direction: 'IN', amount, sender, recipient,
});
const call = (pkg: string, mod: string, fn: string) => ({ package: pkg, module: mod, function: fn });

interface Expect {
  risk: 'RED' | 'YELLOW' | 'GREEN';
  flags?: string[];      // each must be a prefix of some flag
  notFlags?: string[];   // each must NOT be a prefix of any flag
  pkg?: string | null;   // malicious_package_id expectation (undefined = don't check)
}

async function runPayloadCase(name: string, body: any, expect: Expect) {
  try {
    const raw = await callRust(body);
    const resp = raw.response;
    const flags: string[] = resp.flags || [];
    const problems: string[] = [];
    if (resp.risk_level !== expect.risk) problems.push(`risk=${resp.risk_level} want ${expect.risk}`);
    for (const want of expect.flags || []) {
      if (!flags.some((f) => f.startsWith(want))) problems.push(`missing flag ${want}`);
    }
    for (const no of expect.notFlags || []) {
      if (flags.some((f) => f.startsWith(no))) problems.push(`unexpected flag ${no}`);
    }
    if (expect.pkg !== undefined) {
      const pkg = resp.malicious_package_id ?? null;
      const want = expect.pkg === null ? null : expect.pkg;
      if (want === null ? pkg !== null : pkg !== want) problems.push(`pkg=${pkg} want ${want}`);
    }
    if (!verifySig(raw)) problems.push('invalid Ed25519 signature');
    record(name, problems.length === 0, problems.length === 0
      ? `${resp.risk_level} flags=[${flags.join(', ') || 'none'}] pkg=${(resp.malicious_package_id || 'null').slice(0, 14)}…`
      : problems.join('; ') + ` (flags: [${flags.join(', ')}])`);
  } catch (e: any) {
    record(name, false, `error: ${e.message}`);
  }
}

function mapFlows(rawBalances: any[]) {
  return rawBalances.map((c: any) => ({
    asset_type: c.coinType || '0x2::sui::SUI',
    direction: parseInt(c.amount) < 0 ? 'OUT' : 'IN',
    amount: Math.abs(parseInt(c.amount || '0')),
    sender: parseInt(c.amount) < 0 ? (c.owner?.AddressOwner || null) : null,
    recipient: parseInt(c.amount) > 0 ? (c.owner?.AddressOwner || null) : null,
  }));
}

async function buildAndDryRun(tx: Transaction, stage: string) {
  const bytes = await tx.build({ client: makeSuiRpcAdapter('testnet') });
  const txBytes = Buffer.from(bytes).toString('base64');
  const dryRun = await simulateTransactionRaw(txBytes, 'testnet');
  if (dryRun.effects?.status?.status !== 'success') {
    throw new Error(`${stage}: dry-run not success: ${JSON.stringify(dryRun.effects?.status)}`);
  }
  const gasBudget = parseInt(String(Transaction.from(txBytes).getData().gasData.budget));
  return { txBytes, dryRun, gasBudget };
}

async function explain(body: any): Promise<{ status: number; data: any }> {
  const res = await fetch(`${APP_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

function loadSponsor(): Ed25519Keypair {
  const key = process.env.SPONSOR_PRIVATE_KEY!;
  if (key.startsWith('suiprivkey')) return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey);
  const raw = Buffer.from(key, 'base64');
  return Ed25519Keypair.fromSecretKey(raw.length === 33 ? raw.slice(1) : raw);
}

async function main() {
  console.log('━━━ [prereqs] local Rust + app ━━━');
  try {
    const a = await fetch(`${RUST_URL}/get_attestation`);
    if (!a.ok) throw new Error(`attestation HTTP ${a.status}`);
  } catch (e: any) {
    die(`local Rust enclave not reachable on :3001 — ${e.message}`);
  }
  try {
    const h = await fetch(APP_URL);
    if (!h.ok) throw new Error(`app HTTP ${h.status}`);
  } catch (e: any) {
    die(`next dev not reachable on :3100 — ${e.message}`);
  }
  if (!existsSync(VAULT_MV)) die(`${VAULT_MV} missing — run sui move build in move/scammock`);
  record('prereqs', true, 'Rust :3001 + app :3100 up, scammock bytecode present');

  // ── Stage A: payload matrix ────────────────────────────────────────────────
  console.log('\n━━━ [A] payload matrix → local /process_data ━━━');
  await runPayloadCase('A1 honeypot claim+outflow', mkBody({
    intent: 'Claim my airdrop rewards',
    flows: [out(5_000_000)],
  }), { risk: 'RED', flags: ['INTENT_MISMATCH_HONEYPOT', 'UNEXPECTED_OUTFLOW:5000000'], pkg: null });

  await runPayloadCase('A2 ice-phishing permission grant', mkBody({
    intent: 'Claim your free airdrop voucher',
    flows: [out(5_000_000)],
    moveCalls: [call(SCAM_PKG, 'cap', 'authorize')],
  }), { risk: 'RED', flags: ['PERMISSION_GRANT_HONEYPOT', 'INTENT_MISMATCH_HONEYPOT'], pkg: SCAM_PKG });

  await runPayloadCase('A3 direction case evasion "out"', mkBody({
    intent: 'Claim my airdrop',
    flows: [{ ...out(5_000_000), direction: 'out' }],
  }), { risk: 'RED', flags: ['INTENT_MISMATCH_HONEYPOT'] });

  await runPayloadCase('A4 sender-field spoof', mkBody({
    intent: 'Claim my airdrop',
    flows: [out(5_000_000, ATTACKER_2, ATTACKER)],
    userAddress: SPONSOR,
  }), { risk: 'RED', flags: ['INTENT_MISMATCH_HONEYPOT'], notFlags: ['UNEXPECTED_OUTFLOW'] });

  await runPayloadCase('A5 null-recipient multi-drain (4 OUT)', mkBody({
    intent: 'move funds around',
    flows: [out(10_000_000, null), out(10_000_000, null), out(10_000_000, null), out(10_000_000, null)],
  }), { risk: 'RED', flags: ['MULTI_RECIPIENT_DRAIN'], notFlags: ['INTENT_MISMATCH_HONEYPOT'] });

  await runPayloadCase('A6 fan-out 4 unique recipients', mkBody({
    intent: 'move funds around',
    flows: [out(10_000_000, ATTACKER), out(10_000_000, ATTACKER_2), out(10_000_000, ATTACKER_3), out(10_000_000, ATTACKER_4)],
  }), { risk: 'RED', flags: ['MULTI_RECIPIENT_DRAIN'] });

  await runPayloadCase('A7 framework spoof 0X2 (claim+out)', mkBody({
    intent: 'Claim my airdrop',
    flows: [out(5_000_000)],
    moveCalls: [call('0X2', 'pay', 'transfer')],
  }), { risk: 'RED', flags: ['INTENT_MISMATCH_HONEYPOT'], pkg: null });

  await runPayloadCase('A8 framework-only calls are green', mkBody({
    intent: 'check my rewards',
    flows: [],
    moveCalls: [
      call('0x1', 'option', 'destroy_none'),
      call('0x2', 'pay', 'split'),
      call(`0x${'00'.repeat(31)}03`, 'transfer', 'public_transfer'),
    ],
  }), { risk: 'GREEN', flags: [], pkg: null });

  await runPayloadCase('A9 send intent + outflow is green (rust)', mkBody({
    intent: 'send 0.5 SUI to my friend',
    flows: [out(5_000_000, FRIEND)],
  }), { risk: 'GREEN', flags: [] });

  await runPayloadCase('A10 claim intent + inflow is green', mkBody({
    intent: 'Claim my airdrop reward',
    flows: [into(50_000_000)],
  }), { risk: 'GREEN', flags: [] });

  await runPayloadCase('A11 high gas budget yellow', mkBody({
    intent: 'swap tokens',
    flows: [],
    gasBudget: 500_000_001,
  }), { risk: 'YELLOW', flags: ['HIGH_GAS_BUDGET'], notFlags: ['INTENT_MISMATCH_HONEYPOT'] });

  await runPayloadCase('A12 gas budget exact boundary 500M green', mkBody({
    intent: 'swap tokens',
    flows: [],
    gasBudget: 500_000_000,
  }), { risk: 'GREEN', flags: [] });

  await runPayloadCase('A13 plain permission grant yellow', mkBody({
    intent: 'swap on dex',
    flows: [out(5_000_000)],
    moveCalls: [call(SCAM_PKG, 'cap', 'grant')],
  }), { risk: 'YELLOW', flags: ['PERMISSION_GRANT:'], notFlags: ['PERMISSION_GRANT_HONEYPOT', 'INTENT_MISMATCH_HONEYPOT'] });

  await runPayloadCase('A14 PTB bundle abuse yellow', mkBody({
    intent: 'swap tokens',
    flows: [],
    moveCalls: Array.from({ length: 9 }, () => call('0x1', 'vector', 'value')),
  }), { risk: 'YELLOW', flags: ['BUNDLE_COMPLEXITY:9'] });

  await runPayloadCase('A15 large outflow yellow (>=100 SUI)', mkBody({
    intent: 'send to treasury',
    flows: [out(100_000_000_000)],
  }), { risk: 'YELLOW', flags: ['LARGE_OUTFLOW:100000000000'], notFlags: ['INTENT_MISMATCH_HONEYPOT'] });

  await runPayloadCase('A16 mixed-case drain function red', mkBody({
    intent: 'view my portfolio',
    flows: [],
    moveCalls: [call(SCAM_PKG, 'vault', 'Drain_Wallet')],
  }), { risk: 'RED', flags: ['DRAIN_FUNCTION'], pkg: SCAM_PKG });

  await runPayloadCase('A17 garbage direction is not a honeypot', mkBody({
    intent: 'Claim my airdrop',
    flows: [{ ...out(5_000_000), direction: 'INBOUND' }],
  }), { risk: 'GREEN', flags: [] });

  // ── Stage B: real dry-runs → /process_data ────────────────────────────────
  console.log('\n━━━ [B] real testnet dry-runs → /process_data ━━━');

  let b1Bytes = '', b2Bytes = '', b3Bytes = '', b4Bytes = '';
  try {
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(100_000_000n);
    const [c] = tx.splitCoins(tx.gas, [100_000_000n]);
    tx.transferObjects([c], ATTACKER);
    const { txBytes, dryRun, gasBudget } = await buildAndDryRun(tx, 'B1');
    b1Bytes = txBytes;
    const raw = await callRust(mkBody({
      intent: 'Claim my airdrop rewards',
      flows: mapFlows(dryRun.balanceChanges),
      gasBudget,
    }));
    const flags: string[] = raw.response.flags || [];
    const ok = raw.response.risk_level === 'RED'
      && flags.some((f) => f.startsWith('INTENT_MISMATCH_HONEYPOT'))
      && flags.some((f) => f.startsWith('UNEXPECTED_OUTFLOW'))
      && verifySig(raw);
    record('B1 real drain vs claim intent', ok, `risk=${raw.response.risk_level} flags=[${flags.join(', ')}]`);
  } catch (e: any) {
    record('B1 real drain vs claim intent', false, e.message);
  }

  try {
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(100_000_000n);
    const [a, b, c, d] = tx.splitCoins(tx.gas, [10_000_000n, 10_000_000n, 10_000_000n, 10_000_000n]);
    tx.transferObjects([a], ATTACKER);
    tx.transferObjects([b], ATTACKER_2);
    tx.transferObjects([c], ATTACKER_3);
    tx.transferObjects([d], ATTACKER_4);
    const { dryRun, gasBudget } = await buildAndDryRun(tx, 'B2');
    const raw = await callRust(mkBody({
      intent: 'move funds to my collaborators',
      flows: mapFlows(dryRun.balanceChanges),
      gasBudget,
    }));
    const flags: string[] = raw.response.flags || [];
    const ok = raw.response.risk_level === 'RED' && flags.some((f) => f.startsWith('MULTI_RECIPIENT_DRAIN')) && verifySig(raw);
    record('B2 real 4-recipient fan-out', ok, `risk=${raw.response.risk_level} flags=[${flags.join(', ')}]`);
  } catch (e: any) {
    record('B2 real 4-recipient fan-out', false, e.message);
  }

  try {
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(100_000_000n);
    const [c] = tx.splitCoins(tx.gas, [50_000_000n]);
    tx.transferObjects([c], SPONSOR);
    const { txBytes, dryRun, gasBudget } = await buildAndDryRun(tx, 'B3');
    b3Bytes = txBytes;
    const raw = await callRust(mkBody({
      intent: 'move funds between my wallets',
      flows: mapFlows(dryRun.balanceChanges),
      gasBudget,
    }));
    const ok = raw.response.risk_level === 'GREEN' && verifySig(raw);
    record('B3 real self-transfer green', ok, `risk=${raw.response.risk_level} flags=[${(raw.response.flags || []).join(', ') || 'none'}]`);
  } catch (e: any) {
    record('B3 real self-transfer green', false, e.message);
  }

  try {
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(100_000_000n);
    const [c] = tx.splitCoins(tx.gas, [20_000_000n]);
    tx.transferObjects([c], FRIEND);
    const { txBytes, dryRun, gasBudget } = await buildAndDryRun(tx, 'B4');
    b4Bytes = txBytes;
    const raw = await callRust(mkBody({
      intent: 'send 0.02 SUI to my friend',
      flows: mapFlows(dryRun.balanceChanges),
      gasBudget,
    }));
    const ok = raw.response.risk_level === 'GREEN' && verifySig(raw);
    record('B4 real honest send green', ok, `risk=${raw.response.risk_level} flags=[${(raw.response.flags || []).join(', ') || 'none'}]`);
  } catch (e: any) {
    record('B4 real honest send green', false, e.message);
  }

  try {
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(550_000_000n); // > HIGH_GAS_BUDGET threshold (500M)
    tx.transferObjects([tx.splitCoins(tx.gas, [1_000_000n])[0]], SPONSOR);
    const { dryRun, gasBudget } = await buildAndDryRun(tx, 'B5');
    const raw = await callRust(mkBody({
      intent: 'move funds between my wallets',
      flows: mapFlows(dryRun.balanceChanges),
      gasBudget,
    }));
    const flags: string[] = raw.response.flags || [];
    const ok = raw.response.risk_level === 'YELLOW' && flags.some((f) => f.startsWith('HIGH_GAS_BUDGET')) && verifySig(raw);
    record('B5 real high-gas budget yellow', ok, `risk=${raw.response.risk_level} gasBudget=${gasBudget} flags=[${flags.join(', ')}]`);
  } catch (e: any) {
    record('B5 real high-gas budget yellow', false, `dry-run/analysis failed: ${e.message} (boundary covered by A11/A12)`);
  }

  // ── Stage C: publish scammock + full-pipeline /api/explain ────────────────
  console.log('\n━━━ [C] full pipeline (publish + /api/explain) ━━━');
  let vaultPkg: string | null = null;
  try {
    const mv = readFileSync(VAULT_MV);
    const tx = new Transaction();
    tx.setSender(SPONSOR);
    tx.setGasBudget(100_000_000n);
    const cap = tx.publish({ modules: [new Uint8Array(mv)], dependencies: ['0x1', '0x2'] });
    tx.transferObjects([cap], SPONSOR); // PTB requires consuming the publish result
    const bytes = await tx.build({ client: makeSuiRpcAdapter('testnet') });
    const dr = await simulateTransactionRaw(Buffer.from(bytes).toString('base64'), 'testnet');
    if (dr.effects?.status?.status !== 'success') throw new Error(`publish dry-run: ${JSON.stringify(dr.effects?.status)}`);
    const created = (dr.objectChanges || []).filter((c: any) => c.type === 'created');
    const pkgChange = created.find((c: any) => String(c.objectType).toLowerCase() === 'package')
      ?? created.find((c: any) => !c.objectType || !String(c.objectType).includes('::'))
      ?? created[0];
    const candidate = pkgChange?.objectId ?? pkgChange?.objectType;
    if (!candidate || !/^0x[0-9a-fA-F]{64}$/.test(String(candidate))) {
      throw new Error(`could not extract package id from objectChanges: ${JSON.stringify(created)}`);
    }
    vaultPkg = String(candidate);
    const kp = loadSponsor();
    const { signature } = await kp.signTransaction(bytes);
    const res = await executeTransactionBlock({ transactionBlock: bytes, signature });
    if (res.effects?.status?.status !== 'success') throw new Error(`publish exec: ${JSON.stringify(res.effects?.status)}`);
    record('C0 publish scammock package', true, `${vaultPkg} live on testnet, digest=${res.digest}`);
  } catch (e: any) {
    record('C0 publish scammock package', false, e.message);
  }

  // C1: honeypot full pipeline (RED → enclave → on-chain report)
  if (b1Bytes) {
    try {
      const { status, data } = await explain({
        transactionBytes: b1Bytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: 'Claim my airdrop rewards from the VibeGuard campaign',
      });
      const reasons: string[] = data.risk?.reasons || [];
      const ok = status === 200 && data.risk?.riskLevel === 'RED'
        && reasons.some((r) => r.includes('leave your wallet'))
        && reasons.some((r) => r.includes('INTENT MISMATCH'));
      record('C1 explain real honeypot RED', ok, `status=${status} level=${data.risk?.riskLevel} reasons=[${reasons.join(' | ')}]`);
    } catch (e: any) {
      record('C1 explain real honeypot RED', false, e.message);
    }
  } else {
    record('C1 explain real honeypot RED', false, 'skipped — B1 tx unavailable');
  }

  // C2: honest send → YELLOW
  if (b4Bytes) {
    try {
      const { status, data } = await explain({
        transactionBytes: b4Bytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: 'send 0.02 SUI to my friend',
      });
      const reasons: string[] = data.risk?.reasons || [];
      const ok = status === 200 && data.risk?.riskLevel === 'YELLOW'
        && reasons.some((r) => r.includes('confirm recipient'));
      record('C2 explain honest send YELLOW', ok, `status=${status} level=${data.risk?.riskLevel} reasons=[${reasons.join(' | ')}]`);
    } catch (e: any) {
      record('C2 explain honest send YELLOW', false, e.message);
    }
  } else {
    record('C2 explain honest send YELLOW', false, 'skipped — B4 tx unavailable');
  }

  // C3: self-transfer → GREEN
  if (b3Bytes) {
    try {
      const { status, data } = await explain({
        transactionBytes: b3Bytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: 'move funds between my wallets',
      });
      const reasons: string[] = data.risk?.reasons || [];
      const ok = status === 200 && data.risk?.riskLevel === 'GREEN';
      record('C3 explain self-transfer GREEN', ok, `status=${status} level=${data.risk?.riskLevel} reasons=[${reasons.join(' | ')}]`);
    } catch (e: any) {
      record('C3 explain self-transfer GREEN', false, e.message);
    }
  } else {
    record('C3 explain self-transfer GREEN', false, 'skipped — B3 tx unavailable');
  }

  // C4: real vault::drain move call → full pipeline RED + enclave DRAIN_FUNCTION
  if (vaultPkg) {
    try {
      const tx = new Transaction();
      tx.setSender(SPONSOR);
      tx.setGasBudget(100_000_000n);
      const [c] = tx.splitCoins(tx.gas, [30_000_000n]);
      tx.moveCall({ target: `${vaultPkg}::vault::drain`, arguments: [c, tx.pure.address(ATTACKER)] });
      const { txBytes, dryRun, gasBudget } = await buildAndDryRun(tx, 'C4');

      const mirror = await callRust(mkBody({
        intent: 'Claim your airdrop reward',
        flows: mapFlows(dryRun.balanceChanges),
        moveCalls: [call(vaultPkg, 'vault', 'drain')],
        gasBudget,
      }));
      const mFlags: string[] = mirror.response.flags || [];
      record('C4a enclave sees real DRAIN_FUNCTION', mirror.response.risk_level === 'RED'
        && mFlags.some((f) => f.startsWith('DRAIN_FUNCTION'))
        && verifySig(mirror),
        `risk=${mirror.response.risk_level} flags=[${mFlags.join(', ')}]`);

      const { status, data } = await explain({
        transactionBytes: txBytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: 'Claim your airdrop reward',
      });
      const reasons: string[] = data.risk?.reasons || [];
      const parsed: any[] = data.simulation?.staticAnalysis?.moveCalls || [];
      const parsedDrain = parsed.some((c) =>
        String(c.packageId || c.package) === vaultPkg && (c.functionName || c.function) === 'drain');
      const ok = status === 200 && data.risk?.riskLevel === 'RED'
        && reasons.some((r) => r.includes('leave your wallet'))
        && parsedDrain;
      record('C4b explain real vault::drain RED + parsed MoveCall', ok,
        `status=${status} level=${data.risk?.riskLevel} parsedDrain=${parsedDrain} reasons=[${reasons.join(' | ')}]`);
    } catch (e: any) {
      record('C4a enclave sees real DRAIN_FUNCTION', false, e.message);
      record('C4b explain real vault::drain RED + parsed MoveCall', false, e.message);
    }
  } else {
    record('C4a enclave sees real DRAIN_FUNCTION', false, 'skipped — scammock not published');
    record('C4b explain real vault::drain RED + parsed MoveCall', false, 'skipped — scammock not published');
  }

  // C5: real vault::authorize + claim intent → full pipeline RED + PERMISSION_GRANT_HONEYPOT
  if (vaultPkg) {
    try {
      const tx = new Transaction();
      tx.setSender(SPONSOR);
      tx.setGasBudget(100_000_000n);
      tx.moveCall({ target: `${vaultPkg}::vault::authorize`, arguments: [] });
      const { txBytes, dryRun, gasBudget } = await buildAndDryRun(tx, 'C5');

      const mirror = await callRust(mkBody({
        intent: 'Claim your free voucher',
        flows: mapFlows(dryRun.balanceChanges),
        moveCalls: [call(vaultPkg, 'vault', 'authorize')],
        gasBudget,
      }));
      const mFlags: string[] = mirror.response.flags || [];
      record('C5a enclave sees real PERMISSION_GRANT_HONEYPOT', mirror.response.risk_level === 'RED'
        && mFlags.some((f) => f.startsWith('PERMISSION_GRANT_HONEYPOT'))
        && mirror.response.malicious_package_id === vaultPkg
        && verifySig(mirror),
        `risk=${mirror.response.risk_level} flags=[${mFlags.join(', ')}] pkg=${mirror.response.malicious_package_id}`);

      const { status, data } = await explain({
        transactionBytes: txBytes,
        network: 'testnet',
        userAddress: SPONSOR,
        userIntent: 'Claim your free voucher',
      });
      const reasons: string[] = data.risk?.reasons || [];
      const parsed: any[] = data.simulation?.staticAnalysis?.moveCalls || [];
      const parsedAuthorize = parsed.some((c) =>
        String(c.packageId || c.package) === vaultPkg && (c.functionName || c.function) === 'authorize');
      const ok = status === 200 && data.risk?.riskLevel === 'RED'
        && reasons.some((r) => r.includes('INTENT MISMATCH'))
        && parsedAuthorize;
      record('C5b explain real vault::authorize RED + parsed MoveCall', ok,
        `status=${status} level=${data.risk?.riskLevel} parsedAuthorize=${parsedAuthorize} reasons=[${reasons.join(' | ')}]`);
    } catch (e: any) {
      record('C5a enclave sees real PERMISSION_GRANT_HONEYPOT', false, e.message);
      record('C5b explain real vault::authorize RED + parsed MoveCall', false, e.message);
    }
  } else {
    record('C5a enclave sees real PERMISSION_GRANT_HONEYPOT', false, 'skipped — scammock not published');
    record('C5b explain real vault::authorize RED + parsed MoveCall', false, 'skipped — scammock not published');
  }

  // ── Stage D: evidence ──────────────────────────────────────────────────────
  console.log('\n━━━ [D] evidence (logs + on-chain) ━━━');
  const expectReports = [b1Bytes, vaultPkg, vaultPkg].filter(Boolean).length;
  const deadline = Date.now() + 240_000;
  let nextLog = '', digests: string[] = [];
  while (Date.now() < deadline) {
    nextLog = existsSync(APP_LOG) ? readFileSync(APP_LOG, 'utf8') : '';
    digests = [...nextLog.matchAll(/\[auto-reporter\] on-chain success digest=(\S+)/g)].map((m) => m[1]);
    if (digests.length >= expectReports) break;
    await new Promise((r) => setTimeout(r, 5_000));
  }

  const encConnected = nextLog.includes('EnclaveClient: connected to http://localhost:3001');
  const verifiedCount = (nextLog.match(/🔐 Enclave signature verification:[\s\S]{0,200}verified: true/g) || []).length;
  const encFailed = nextLog.includes('Enclave signature verification FAILED') || nextLog.includes('Enclave signature failed, falling back');
  const redExplains = results.filter((r) => /^C\d.*RED/.test(r.stage) && r.ok).length;
  record('D1 app → local enclave (log)', encConnected && verifiedCount >= redExplains && !encFailed,
    `connected=${encConnected} verifiedTrue=${verifiedCount} expected>=${redExplains} failed=${encFailed}`);

  const flushFails = [...nextLog.matchAll(/\[auto-reporter\] (?:flush failed|flush call failed): (.*)/g)].map((m) => m[1]);
  record('D2 auto-reports on-chain', digests.length >= expectReports,
    `expected>=${expectReports} got=${digests.length}${flushFails.length ? ` flushErrors=[${flushFails.join(' | ')}]` : ''} digests=[${digests.join(', ')}]`);

  for (const digest of digests) {
    let lastErr = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const txq = await graphqlQuery<any>(
          'query($d: String!) { transaction(digest: $d) { digest sender { address } effects { status } } }',
          { d: digest },
          'testnet',
        );
        const t = txq?.transaction;
        if (t) {
          record(`D3 GraphQL ${digest.slice(0, 10)}…`, JSON.stringify(t.effects?.status ?? t.effects).includes('SUCCESS'),
            `sender=${t.sender?.address?.slice(0, 12)}… effects=${JSON.stringify(t.effects?.status ?? t.effects)}`);
          lastErr = '';
          break;
        }
        lastErr = 'not found (indexer lag?)';
      } catch (e: any) {
        lastErr = `query failed: ${e.message}`;
      }
      await new Promise((r) => setTimeout(r, 6_000));
    }
    if (lastErr) record(`D3 GraphQL ${digest.slice(0, 10)}…`, false, lastErr);
  }

  if (existsSync(RUST_LOG)) {
    const rustLog = readFileSync(RUST_LOG, 'utf8');
    record('D4 rust server uptime', rustLog.includes('Server ready'), rustLog.includes('Server ready') ? 'Server ready present' : 'missing readiness');
  }

  console.log('\n━━━━━━━━━━ SUMMARY ━━━━━━━━━━');
  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.stage}`);
  }
  console.log(allOk
    ? '\nADVERSARIAL SUITE PASSED — evasion cases caught, false positives held, reports landed on-chain.'
    : '\nSOME CHECKS FAILED — see details above.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => die(e.stack || String(e)));
