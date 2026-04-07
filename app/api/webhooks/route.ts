import { NextRequest, NextResponse } from 'next/server';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

const webhooks = new Map<string, Webhook>();

export async function POST(request: NextRequest) {
  try {
    const { url, events, apiKey } = await request.json();

    if (!url || !events || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const webhook: Webhook = {
      id: webhookId,
      url,
      events,
      active: true,
    };

    webhooks.set(webhookId, webhook);

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhookId,
        url,
        events,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    webhooks: Array.from(webhooks.values()),
  });
}
