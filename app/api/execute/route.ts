import { NextResponse } from 'next/server';
import { executeTransactionBlock, resolveNetwork } from '@/lib/sui-rpc';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      transactionBlock?: string;
      signature?: string | string[];
      network?: string;
    };

    if (!body.transactionBlock || !body.signature) {
      return NextResponse.json(
        { error: 'transactionBlock and signature are required' },
        { status: 400 },
      );
    }

    const result = await executeTransactionBlock({
      transactionBlock: body.transactionBlock,
      signature: body.signature,
      network: resolveNetwork(body.network),
    });

    if (result.effects?.status?.status !== 'success') {
      return NextResponse.json(
        {
          digest: result.digest,
          effects: result.effects,
          error: result.effects?.status?.error || 'Transaction execution failed',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      digest: result.digest,
      effects: result.effects,
    });
  } catch (err: any) {
    console.error('[execute] error:', err?.message);
    return NextResponse.json({ error: err?.message || 'Execution failed' }, { status: 500 });
  }
}
