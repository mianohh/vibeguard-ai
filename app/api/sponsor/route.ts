import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export async function POST(req: Request) {
  try {
    if (!process.env.SPONSOR_PRIVATE_KEY) {
      return Response.json({ error: 'Sponsor not configured' }, { status: 500 });
    }

    const body = await req.json();

    if (!body.packageId || !body.registryId || !body.maliciousPackageId || !body.walrusBlobId || !body.blobObjectId || !body.sender) {
      return Response.json({ error: 'Missing required parameters: packageId, registryId, maliciousPackageId, walrusBlobId, blobObjectId, or sender' }, { status: 400 });
    }

    const rawKey = fromBase64(process.env.SPONSOR_PRIVATE_KEY);
    const secretKey = rawKey.length === 33 ? rawKey.slice(1) : rawKey;
    const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sponsorAddress = sponsorKeypair.toSuiAddress();

    const coins = await suiClient.getCoins({ owner: sponsorAddress, coinType: '0x2::sui::SUI' });

    if (coins.data.length === 0) {
      return Response.json({ error: 'Sponsor wallet has insufficient funds' }, { status: 503 });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${body.packageId}::registry::report_malicious_contract`,
      arguments: [
        tx.object(body.registryId),
        tx.pure.address(body.maliciousPackageId),
        tx.pure.string(body.walrusBlobId),
        tx.pure.address(body.blobObjectId),
      ],
    });

    tx.setSender(body.sender);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(10_000_000);

    console.log('[sponsor] tx built', { network: 'testnet', senderPrefix: body.sender?.slice(0, 8), gasBudget: 10_000_000 });

    const builtTxBytes = await tx.build({ client: suiClient });
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(builtTxBytes);

    return Response.json({
      txBytes: toBase64(builtTxBytes),
      sponsorSignature: sponsorSignatureResult.signature
    });

  } catch (e: any) {
    console.error('[sponsor] error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
