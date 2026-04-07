interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

const webhooks = new Map<string, Webhook>();

export function registerWebhook(webhook: Webhook) {
  webhooks.set(webhook.id, webhook);
}

export function getWebhooks() {
  return Array.from(webhooks.values());
}

export async function triggerWebhooks(event: string, data: any) {
  const activeWebhooks = Array.from(webhooks.values()).filter(
    (wh) => wh.active && wh.events.includes(event)
  );

  await Promise.all(
    activeWebhooks.map(async (webhook) => {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, data, timestamp: Date.now() }),
        });
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
      }
    })
  );
}
