import { NextRequest } from 'next/server';
import { queryEventsPage } from '@/lib/sui-rpc';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const seen = new Set<string>();
      let primed = false;

      const poll = async () => {
        try {
          const { events } = await queryEventsPage({
            eventType: `${PACKAGE_ID}::registry::ThreatReported`,
            direction: 'descending',
            limit: 10,
          });

          const fresh = [];
          for (const event of events) {
            const key = `${event.txDigest}:${event.sequenceNumber}`;
            if (seen.has(key)) continue;
            seen.add(key);
            fresh.push(event);
          }

          if (!primed) {
            primed = true;
          } else {
            for (const event of fresh) {
              const data = `data: ${JSON.stringify(event.parsedJson)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          if (seen.size > 500) {
            seen.clear();
          }

          setTimeout(poll, 5000);
        } catch (error) {
          try {
            controller.error(error);
          } catch {
            controller.close();
          }
        }
      };

      request.signal.addEventListener('abort', () => {
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      });

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
