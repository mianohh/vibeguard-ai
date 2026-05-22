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
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const rawKey = fromBase64(process.env.SPONSOR_PRIVATE_KEY);
    const secretKey = rawKey.length === 33 ? rawKey.slice(1) : rawKey;
    const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sponsorAddress = sponsorKeypair.toSuiAddress();

    const coins = await suiClient.getCoins({ owner: sponsorAddress, coinType: '0x2::sui::SUI' });

    if (coins.data.length === 0) {
      return Response.json({ error: 'Sponsor wallet has insufficient funds' }, { status: 503 });
    }

    const totalBalance = coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
    if (totalBalance < BigInt(5_000_000)) {
      console.warn(`[sponsor] LOW GAS WARNING: ${totalBalance} MIST remaining`);
      return Response.json({ error: 'Sponsor wallet critically low on gas' }, { status: 503 });
    }
    if (totalBalance < BigInt(50_000_000)) {
      console.warn(`[sponsor] Gas balance low: ${totalBalance} MIST — consider refilling`);
    }

    const tx = new Transaction();

    // Call 1: verify_and_report on seal_enclave — proves the payload was signed
    // by the approved enclave keypair before accepting it into the registry.
    // This is the on-chain verification step of the Seal–Nautilus integration.
    if (body.sealPackageId && body.enclaveConfigId && body.enclaveSignature) {
      const sigBytes = Array.from(Buffer.from(body.enclaveSignature, 'base64'));
      tx.moveCall({
        target: `${body.sealPackageId}::enclave::verify_and_report`,
        arguments: [
          tx.object(body.enclaveConfigId),
          tx.pure.address(body.maliciousPackageId),
          tx.pure.string(body.walrusBlobId),
          tx.pure.vector('u8', sigBytes),
          tx.pure.u64(body.timestampMs ?? Date.now()),
          tx.object('0x6'), // Sui Clock shared object
        ],
      });
    }

    // Call 2: report_malicious_contract on reputation_registry — existing pipeline
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

    console.log('[sponsor] tx built', { network: 'testnet', senderPrefix: body.sender?.slice(0, 8)?.replace(/[^a-fA-F0-9x]/g, ''), gasBudget: 10_000_000 });

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
