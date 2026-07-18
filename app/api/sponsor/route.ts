import { SuiClient } from '@mysten/sui/client';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

const suiClient = new SuiClient({ url: process.env.SUI_RPC_URL || 'https://sui-testnet.publicnode.com' });

function addReportCalls(
  tx: Transaction,
  report: { maliciousPackageId: string; walrusBlobId: string; blobObjectId: string; enclaveSignature?: string; timestampMs?: number },
  opts: { packageId: string; registryId: string; sealPackageId?: string; enclaveConfigId?: string }
) {
  if (opts.sealPackageId && opts.enclaveConfigId && report.enclaveSignature) {
    const sigBytes = Array.from(Buffer.from(report.enclaveSignature, 'base64'));
    tx.moveCall({
      target: `${opts.sealPackageId}::enclave::verify_and_report`,
      arguments: [
        tx.object(opts.enclaveConfigId),
        tx.pure.address(report.maliciousPackageId),
        tx.pure.string(report.walrusBlobId),
        tx.pure.vector('u8', sigBytes),
        tx.pure.u64(BigInt(report.timestampMs ?? Date.now())),
        tx.object('0x6'),
      ],
    });
  }
  tx.moveCall({
    target: `${opts.packageId}::registry::report_malicious_contract`,
    arguments: [
      tx.object(opts.registryId),
      tx.pure.address(report.maliciousPackageId),
      tx.pure.string(report.walrusBlobId),
      tx.pure.address(report.blobObjectId),
    ],
  });
}

export async function POST(req: Request) {
  try {
    if (!process.env.SPONSOR_PRIVATE_KEY) {
      return Response.json({ error: 'Sponsor not configured' }, { status: 500 });
    }

    const body = await req.json();

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
    const opts = {
      packageId: body.packageId,
      registryId: body.registryId,
      sealPackageId: body.sealPackageId,
      enclaveConfigId: body.enclaveConfigId,
    };
    let gasBudget: number;

    if (Array.isArray(body.reports) && body.reports.length > 0) {
      // ── Batch path ────────────────────────────────────────────────────────
      if (!body.packageId || !body.registryId || !body.sender) {
        return Response.json({ error: 'Missing required batch parameters' }, { status: 400 });
      }
      for (const report of body.reports) addReportCalls(tx, report, opts);
      gasBudget = 5_000_000 * body.reports.length + 1_000_000;
      console.log(`[sponsor] batch tx built batchSize=${body.reports.length} gasBudget=${gasBudget}`);
    } else {
      // ── Single-report path ────────────────────────────────────────────────
      if (!body.packageId || !body.registryId || !body.maliciousPackageId || !body.walrusBlobId || !body.blobObjectId || !body.sender) {
        return Response.json({ error: 'Missing required parameters' }, { status: 400 });
      }
      addReportCalls(tx, body, opts);
      gasBudget = 10_000_000;
      console.log(`[sponsor] single tx built gasBudget=${gasBudget}`);
    }

    tx.setSender(body.sender);
    tx.setGasOwner(sponsorAddress);
    tx.setGasBudget(gasBudget);

    const builtTxBytes = await tx.build({ client: suiClient });
    const sponsorSignatureResult = await sponsorKeypair.signTransaction(builtTxBytes);

    return Response.json({
      txBytes: toBase64(builtTxBytes),
      sponsorSignature: sponsorSignatureResult.signature,
    });

  } catch (e: any) {
    console.error('[sponsor] error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
