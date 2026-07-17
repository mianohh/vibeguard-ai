import { NextResponse } from 'next/server';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

export const maxDuration = 10; // Vercel Hobby limit

interface FlushReport {
  maliciousPackageId: string;
  reasons: string[];
}

interface EnclaveSignResponse {
  signature: string;
  blob_id: string;
  blob_object_id: string;
  timestamp_ms: number;
}

function loadSponsor(): Ed25519Keypair {
  const key = process.env.SPONSOR_PRIVATE_KEY!;
  if (key.startsWith('suiprivkey')) {
    return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(key).secretKey);
  }
  const raw = Buffer.from(key, 'base64');
  return Ed25519Keypair.fromSecretKey(raw.length === 33 ? raw.slice(1) : raw);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { reports: FlushReport[] };
    const { reports } = body;

    if (!reports?.length) {
      return NextResponse.json({ ok: true, flushed: 0 });
    }

    const enclaveUrl  = process.env.ENCLAVE_URL!;
    const PACKAGE_ID  = process.env.NEXT_PUBLIC_PACKAGE_ID!;
    const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID!;
    const SEAL_PKG    = process.env.SEAL_ENCLAVE_PACKAGE_ID!;
    const ENCLAVE_CFG = process.env.ENCLAVE_CONFIG_OBJECT_ID!;
    const sponsor     = loadSponsor();
    const reporter    = sponsor.toSuiAddress();

    // ── Step 1: call enclave /sign_report for each report (parallel)
    // Enclave handles Walrus upload internally and returns blob_id + signature
    const signResults = await Promise.allSettled(
      reports.map(r =>
        fetch(`${enclaveUrl}/sign_report`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            malicious_package_id: r.maliciousPackageId,
            reasons:              r.reasons,
            reporter,
          }),
          signal: AbortSignal.timeout(15000),
        }).then(async res => {
          if (!res.ok) throw new Error(`enclave error: ${await res.text()}`);
          return res.json() as Promise<EnclaveSignResponse>;
        })
      )
    );

    const assembled = reports
      .map((r, i) => ({ r, res: signResults[i] }))
      .filter(({ res }) => res.status === 'fulfilled')
      .map(({ r, res }) => {
        const enc = (res as PromiseFulfilledResult<EnclaveSignResponse>).value;
        return {
          maliciousPackageId: r.maliciousPackageId,
          walrusBlobId:       enc.blob_id,
          blobObjectId:       enc.blob_object_id,
          enclaveSignature:   Buffer.from(enc.signature, 'hex').toString('base64'),
          timestampMs:        enc.timestamp_ms,
        };
      });

    if (assembled.length === 0) {
      return NextResponse.json({ ok: false, error: 'all enclave calls failed' }, { status: 502 });
    }

    // ── Step 2: build single PTB for all assembled reports
    const suiRpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
    const suiClient = new SuiClient({ url: suiRpcUrl });
    const tx        = new Transaction();

    for (const a of assembled) {
      if (SEAL_PKG && ENCLAVE_CFG) {
        tx.moveCall({
          target: `${SEAL_PKG}::enclave::verify_and_report`,
          arguments: [
            tx.object(ENCLAVE_CFG),
            tx.pure.address(a.maliciousPackageId),
            tx.pure.string(a.walrusBlobId),
            tx.pure.vector('u8', Array.from(Buffer.from(a.enclaveSignature, 'base64'))),
            tx.pure.u64(BigInt(a.timestampMs)),
            tx.object('0x6'),
          ],
        });
      }
      tx.moveCall({
        target: `${PACKAGE_ID}::registry::report_malicious_contract`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.address(a.maliciousPackageId),
          tx.pure.string(a.walrusBlobId),
          tx.pure.address(a.blobObjectId),
        ],
      });
    }

    const gasBudget = 5_000_000 * assembled.length + 1_000_000;
    tx.setSender(reporter);
    tx.setGasOwner(reporter);
    tx.setGasBudget(gasBudget);

    const builtBytes = await tx.build({ client: suiClient });
    const { signature: sponsorSig } = await sponsor.signTransaction(builtBytes);

    const result = await suiClient.executeTransactionBlock({
      transactionBlock: builtBytes,
      signature:        [sponsorSig],
      options:          { showEffects: true },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`PTB failed: ${result.effects?.status?.error}`);
    }

    return NextResponse.json({
      ok:      true,
      flushed: assembled.length,
      digest:  result.digest,
    });

  } catch (err: any) {
    console.error('[flush] error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
