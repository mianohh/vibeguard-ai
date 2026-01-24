// generate_test.js
// Usage:
//   node generate_test.js <YOUR_PUBLIC_ADDRESS> [ATTACKER_ADDRESS]
// Example:
//   node generate_test.js 0x97b3...c807 0x1234...1234

const crypto = require('crypto');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');

const MY_ADDRESS = process.argv[2];
const ATTACKER_ADDRESS =
  process.argv[3] ||
  '0x1234567890123456789012345678901234567890123456789012345678901234';

function isValidSuiAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{64}$/.test(addr.trim());
}

if (!MY_ADDRESS) {
  console.error('❌ Error: Please provide your address.');
  console.log('Usage: node generate_test.js <YOUR_PUBLIC_ADDRESS> [ATTACKER_ADDRESS]');
  process.exit(1);
}
if (!isValidSuiAddress(MY_ADDRESS)) {
  console.error('❌ Error: YOUR_PUBLIC_ADDRESS is not a valid 32-byte Sui address.');
  process.exit(1);
}
if (!isValidSuiAddress(ATTACKER_ADDRESS)) {
  console.error('❌ Error: ATTACKER_ADDRESS is not a valid 32-byte Sui address.');
  process.exit(1);
}

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

function toBase64(u8) {
  return Buffer.from(u8).toString('base64');
}
function sha256Hex(u8) {
  return crypto.createHash('sha256').update(Buffer.from(u8)).digest('hex');
}

async function buildTransferTxBytes({ sender, recipient, amountMist }) {
  const tx = new TransactionBlock();

  // split 1 MIST from gas coin
  const [coin] = tx.splitCoins(tx.gas, [amountMist]);

  // IMPORTANT: encode recipient as a pure address argument
  tx.transferObjects([coin], tx.pure.address(recipient));

  tx.setSender(sender);

  // build unsigned transaction bytes (good for dryRun)
  const bytes = await tx.build({ client });
  return bytes;
}

async function dryRunAndSummarize(bytes) {
  const resp = await client.dryRunTransactionBlock({
    transactionBlock: bytes,
    options: {
      showEffects: true,
      showBalanceChanges: true,
      showObjectChanges: true,
      showEvents: false,
      showInput: false,
    },
  });

  // Extract balanceChanges from top-level field
  const changes = resp?.balanceChanges || [];
  // Normalize for printing
  const simplified = changes.map((c) => ({
    owner:
      c.owner?.AddressOwner
        ? `AddressOwner(${String(c.owner.AddressOwner).slice(0, 10)}...${String(c.owner.AddressOwner).slice(-6)})`
        : c.owner?.ObjectOwner
        ? `ObjectOwner(${String(c.owner.ObjectOwner).slice(0, 10)}...${String(c.owner.ObjectOwner).slice(-6)})`
        : c.owner?.Shared
        ? 'Shared'
        : 'Unknown',
    coinType: c.coinType,
    amount: c.amount,
  }));

  return { status: resp.effects?.status, balanceChanges: simplified };
}

(async () => {
  try {
const AMOUNT = 100000n; // Larger amount to make balance changes visible

    console.log(`\n🔌 Active Address: ${MY_ADDRESS.slice(0, 10)}...${MY_ADDRESS.slice(-6)}`);
    console.log(`🧪 Network: Testnet`);
    console.log(`🚨 Danger Recipient: ${ATTACKER_ADDRESS.slice(0, 10)}...${ATTACKER_ADDRESS.slice(-6)}`);

    console.log('\n⚙️  Generating ✅ SAFE (Self-Transfer) base64 transaction...');
    const safeBytes = await buildTransferTxBytes({
      sender: MY_ADDRESS,
      recipient: MY_ADDRESS,
      amountMist: AMOUNT,
    });

    console.log('\n⚙️  Generating 🚨 DANGER (Transfer to Stranger) base64 transaction...');
    const dangerBytes = await buildTransferTxBytes({
      sender: MY_ADDRESS,
      recipient: ATTACKER_ADDRESS,
      amountMist: AMOUNT,
    });

    const safeB64 = toBase64(safeBytes);
    const dangerB64 = toBase64(dangerBytes);

    // Quick sanity: hashes must differ
    const safeHash = sha256Hex(safeBytes);
    const dangerHash = sha256Hex(dangerBytes);

    console.log('\n===================== SANITY CHECK =====================');
    console.log(`SAFE   sha256: ${safeHash}`);
    console.log(`DANGER sha256: ${dangerHash}`);
    if (safeHash === dangerHash) {
      console.log('❌ Still identical bytes. Something is wrong (SDK mismatch or recipient encoding).');
      process.exit(1);
    } else {
      console.log('✅ Bytes differ — your DANGER tx is now truly different.');
    }

    console.log('\n===================== OUTPUT =====================');

    console.log('\n✅ SAFE MODE — COPY THIS BASE64 STRING:');
    console.log('---------------------------------------------------');
    console.log(safeB64);
    console.log('---------------------------------------------------');

    console.log('\n🚨 DANGER MODE — COPY THIS BASE64 STRING:');
    console.log('---------------------------------------------------');
    console.log(dangerB64);
    console.log('---------------------------------------------------');

    // Optional: prove dryRun sees balance changes
    console.log('\n===================== OPTIONAL DRY RUN PROOF =====================');
    console.log('Dry-running SAFE...');
    const safeDry = await dryRunAndSummarize(safeBytes);
    console.log(JSON.stringify(safeDry, null, 2));

    console.log('\nDry-running DANGER...');
    const dangerDry = await dryRunAndSummarize(dangerBytes);
    console.log(JSON.stringify(dangerDry, null, 2));

    console.log('\n👉 Paste each base64 into VibeGuard. The DANGER one should now show outflow / RED or at least YELLOW.');

  } catch (e) {
    console.error('\n❌ FAILED:', e?.message || e);
    process.exit(1);
  }
})();