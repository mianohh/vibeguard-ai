import { NextRequest } from 'next/server';
import { SuiClient } from '@mysten/sui/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const suiClient = new SuiClient({ url: process.env.SUI_RPC_URL || 'https://sui-testnet.publicnode.com' });

  const stream = new ReadableStream({
    async start(controller) {
      let cursor: string | null = null;

      const poll = async () => {
        try {
          const events = await suiClient.queryEvents({
            query: { MoveEventType: `${PACKAGE_ID}::registry::ThreatReported` },
            cursor: cursor as any,
            limit: 10,
            order: 'descending',
          });

          for (const event of events.data) {
            const data = `data: ${JSON.stringify(event.parsedJson)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          if (events.hasNextPage) {
            cursor = events.nextCursor as any;
          }

          setTimeout(poll, 5000);
        } catch (error) {
          controller.error(error);
        }
      };

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
