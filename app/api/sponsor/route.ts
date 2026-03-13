import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// 1. FORCE DEVNET
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log('📦 Received request body:', JSON.stringify(body, null, 2));

    // 2. PARSE KEY AND GET ADDRESS
    const rawKey = fromBase64(process.env.SPONSOR_PRIVATE_KEY!);
    const secretKey = rawKey.length === 33 ? rawKey.slice(1) : rawKey;
    const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sponsorAddress = sponsorKeypair.toSuiAddress();

    console.log("==========================================");
    console.log("🚨 1. TARGET SPONSOR: 0xea908256b1b9d6ec0bbc3516699a3bb8f75ad300aaaf0cedec4302913619a7e6");
    console.log("🚨 2. ACTUAL SPONSOR:", sponsorAddress);

    // 3. FORCE BALANCE CHECK
    const coins = await suiClient.getCoins({ owner: sponsorAddress, coinType: '0x2::sui::SUI' });
    console.log(`🚨 3. COINS FOUND ON DEVNET: ${coins.data.length}`);
    
    if (coins.data.length === 0) {
      throw new Error(`Sponsor address ${sponsorAddress} has 0 coins on Devnet.`);
    }

    // 4. BUILD NEW TRANSACTION WITH SPONSOR AS GAS PAYER
    if (!body.packageId || !body.registryId || !body.maliciousPackageId || !body.walrusBlobId || !body.sender) {
      throw new Error('Missing required parameters: packageId, registryId, maliciousPackageId, walrusBlobId, or sender');
    }
    
    const tx = new Transaction();
    
    // Reconstruct the Move call from frontend data
    tx.moveCall({
      target: `${body.packageId}::registry::report_malicious_contract`,
      arguments: [
        tx.object(body.registryId),
        tx.pure.address(body.maliciousPackageId),
        tx.pure.string(body.walrusBlobId),
      ],
    });
    
    tx.setSender(body.sender);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(10000000);

    console.log("🚨 4. BUILDING TX WITH SENDER:", body.sender, "GAS OWNER:", sponsorAddress);
    console.log("==========================================\n");

    // Build and sign
    const builtTxBytes = await tx.build({ client: suiClient });
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(builtTxBytes);

    return Response.json({
      txBytes: toBase64(builtTxBytes),
      sponsorSignature: sponsorSignatureResult.signature
    });

  } catch (e: any) {
    console.error("❌ Sponsor API Error:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
