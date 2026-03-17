import { createClient } from 'redis';

const KEYS = {
  totalScans: 'vg:totalScans',
  scamsBlocked: 'vg:scamsBlocked',
  totalValueProtected: 'vg:totalValueProtected',
  lastUpdated: 'vg:lastUpdated',
};

function getClient() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (e) => console.error('Redis error:', e.message));
  return client;
}

async function withRedis<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
  const client = getClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.quit();
  }
}

export const analytics = {
  async increment(field: 'totalScans' | 'scamsBlocked', value: number = 1) {
    await withRedis(async (c) => {
      await c.incrBy(KEYS[field], value);
      await c.set(KEYS.lastUpdated, new Date().toISOString());
    });
  },

  async addValueProtected(suiAmount: number) {
    await withRedis(async (c) => {
      const current = parseFloat((await c.get(KEYS.totalValueProtected)) ?? '0');
      await c.set(KEYS.totalValueProtected, (current + suiAmount).toString());
      await c.set(KEYS.lastUpdated, new Date().toISOString());
    });
  },

  async getData() {
    return withRedis(async (c) => {
      const [totalScans, scamsBlocked, totalValueProtected, lastUpdated] = await Promise.all([
        c.get(KEYS.totalScans),
        c.get(KEYS.scamsBlocked),
        c.get(KEYS.totalValueProtected),
        c.get(KEYS.lastUpdated),
      ]);
      return {
        totalScans: parseInt(totalScans ?? '0'),
        scamsBlocked: parseInt(scamsBlocked ?? '0'),
        totalValueProtected: parseFloat(totalValueProtected ?? '0'),
        lastUpdated: lastUpdated ?? new Date().toISOString(),
      };
    });
  }
};
