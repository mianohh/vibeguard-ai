/**
 * register-and-report.ts — Register new enclave key on-chain, then report a
 * real RED threat through the full pipeline.
 *
 * Step 1: Fetch attestation from the live enclave → register PCRs + pubkey
 *         on-chain via seal_enclave::enclave::register_enclave.
 * Step 2: Build a dangerous PTB (drain 0.3 SUI to attacker vs "claim airdrop"
 *         intent) and submit to /api/explain → expect RED.
 * Step 3: Call /api/flush to register the threat on-chain (enclave signs →
 *         Walrus upload → verify_and_report + report_malicious_contract).
 *
 * Usage: npx tsx --env-file=.env.local scripts/register-and-report.ts
 */
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { fromBase64 } from '@mysten/sui/utils';
import { suiRpcAdapter, executeTransactionBlock, makeSuiRpcAdapter, simulateTransactionRaw } from '../lib/sui-rpc';

const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://92.4.140.187:3000';
const SEAL_PKG = process.env.SEAL_ENCLAVE_PACKAGE_ID!;
const ENCLAVE_CFG = process.env.ENCLAVE_CONFIG_OBJECT_ID!;
const APP_URL = 'http://localhost:3000';

const SPONSOR = '0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6';
const ATTACKER = '0xc0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00';
const USER_INTENT = 'Claim my airdrop rewards from the VibeGuard campaign';

function loadSponsor(): Ed25519Keypair {
  const key = process.env.SPONSOR_PRIVATE_KEY!;
  return key.startsWith('suiprivkey')
    ? Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey)
    : Ed25519Keypair.fromSecretKey(fromBase64(key).slice(1));
}

async function main() {
  // ━━━ Step 1: Register new enclave attestation on-chain ━━━
  console.log('━━━ [1/5] Fetching enclave attestation ━━━');

  const attRes = await fetch(`${ENCLAVE_URL}/get_attestation`);
  if (!attRes.ok) throw new Error(`attestation fetch failed: HTTP ${attRes.status}`);
  const att = await attRes.json() as {
    public_key: string;
    pcr0: string;
    pcr1: string;
    pcr2: string;
    provider: string;
    mode: string;
  };

  console.log(`   Public key: ${att.public_key.slice(0, 16)}…`);
  console.log(`   PCRs:       ${att.pcr0.slice(0, 16)}… / ${att.pcr1.slice(0, 16)}… / ${att.pcr2.slice(0, 16)}…`);
  console.log(`   Mode:       ${att.mode}`);

  console.log('\n━━━ [2/5] Registering enclave on-chain (seal_enclave::enclave::register_enclave) ━━━');

  const sponsor = loadSponsor();
  const reporter = sponsor.toSuiAddress();
  console.log(`   Sponsor: ${reporter}`);

  const regTx = new Transaction();
  regTx.moveCall({
    target: `${SEAL_PKG}::enclave::register_enclave`,
    arguments: [
      regTx.object(ENCLAVE_CFG),
      regTx.pure.vector('u8', Array.from(Buffer.from(att.pcr0, 'hex'))),
      regTx.pure.vector('u8', Array.from(Buffer.from(att.pcr1, 'hex'))),
      regTx.pure.vector('u8', Array.from(Buffer.from(att.pcr2, 'hex'))),
      regTx.pure.vector('u8', Array.from(Buffer.from(att.public_key, 'hex'))),
    ],
  });
  regTx.setSender(reporter);
  regTx.setGasBudget(10_000_000);

  const regBytes = await regTx.build({ client: suiRpcAdapter });
  const { signature: regSig } = await sponsor.signTransaction(regBytes);
  const regResult = await executeTransactionBlock({ transactionBlock: regBytes, signature: [regSig] });

  if (regResult.effects?.status?.status !== 'success') {
    throw new Error(`Registration failed: ${JSON.stringify(regResult.effects?.status)}`);
  }
  console.log(`   ✅ Enclave registered on-chain: ${regResult.digest}`);
  console.log(`   Explorer: https://suiscan.xyz/testnet/tx/${regResult.digest}`);

  // ━━━ Step 3: Build the dangerous PTB ━━━
  console.log('\n━━━ [3/5] Building dangerous PTB (drain 0.3 SUI → attacker, intent: "claim airdrop") ━━━');

  const tx = new Transaction();
  tx.setSender(SPONSOR);
  tx.setGasBudget(100_000_000n);
  const [drainCoin] = tx.splitCoins(tx.gas, [300_000_000n]);
  tx.transferObjects([drainCoin], ATTACKER);

  const adapter = makeSuiRpcAdapter('testnet');
  const bytes = await tx.build({ client: adapter });
  const txBytes = Buffer.from(bytes).toString('base64');
  console.log(`   ✅ Built ${bytes.length} bytes`);

  // ━━━ Step 4: Submit to /api/explain ━━━
  console.log('\n━━━ [4/5] Submit to /api/explain (full detection pipeline) ━━━');

  const explainRes = await fetch(`${APP_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionBytes: txBytes,
      network: 'testnet',
      userAddress: SPONSOR,
      userIntent: USER_INTENT,
    }),
  });

  if (explainRes.status !== 200) {
    const errBody = await explainRes.text();
    throw new Error(`/api/explain HTTP ${explainRes.status}: ${errBody.slice(0, 300)}`);
  }

  const explain = await explainRes.json() as any;
  const risk = explain.risk || {};

  console.log(`\n   VERDICT: ${risk.riskLevel} (confidence ${Math.round((risk.confidence || 0) * 100)}%)`);
  console.log(`   Action:  ${explain.explanation?.recommendedAction}`);
  console.log(`   Reason:  ${explain.explanation?.headline}`);
  for (const r of (risk.reasons || [])) {
    console.log(`     ✗ ${r}`);
  }

  if (risk.riskLevel !== 'RED') {
    throw new Error(`Expected RED, got ${risk.riskLevel}`);
  }
  console.log('\n   ✅ RED verdict confirmed');

  // ━━━ Step 5: Register threat on-chain via /api/flush ━━━
  console.log('\n━━━ [5/5] Register threat on-chain (enclave → Walrus → registry) ━━━');

  const flushRes = await fetch(`${APP_URL}/api/flush`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reports: [{
        maliciousPackageId: ATTACKER,
        reasons: risk.reasons,
        nonce: `red-test-${Date.now()}`,
      }],
    }),
  });

  const flushBody = await flushRes.json() as any;

  if (flushBody.ok) {
    console.log(`   ✅ Threat registered on-chain!`);
    console.log(`   Digest: ${flushBody.digest}`);
    console.log(`   Explorer: https://suiscan.xyz/testnet/tx/${flushBody.digest}`);
    console.log(`   Reports flushed: ${flushBody.flushed}`);
  } else {
    console.error(`   ❌ Flush failed: ${flushBody.error}`);
    throw new Error(flushBody.error);
  }

  // ━━━ Summary ━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FULL PIPELINE SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  1. Enclave registered:  ${regResult.digest.slice(0, 12)}…`);
  console.log(`  2. Dangerous tx built:  drain 0.3 SUI → ${ATTACKER.slice(0, 10)}…`);
  console.log(`  3. VibeGuard verdict:   RED (${Math.round((risk.confidence || 0) * 100)}%)`);
  console.log(`     ${explain.explanation?.headline}`);
  console.log(`     ${(risk.reasons || []).join('; ')}`);
  console.log(`  4. On-chain report:     ${flushBody.digest?.slice(0, 12)}…`);
  console.log(`     Explorer: https://suiscan.xyz/testnet/tx/${flushBody.digest}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => { console.error(e.stack || String(e)); process.exit(1); });
