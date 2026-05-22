import { createClient } from 'redis';

function getClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not configured');
  const parsed = new URL(redisUrl);
  if (!['redis:', 'rediss:'].includes(parsed.protocol)) throw new Error('Invalid REDIS_URL protocol');
  const client = createClient({ url: redisUrl });
  client.on('error', (e) => console.error('Redis rate-limit error:', e.message.replace(/\n|\r/g, '')));
  return client;
}

export async function rateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowSec = Math.ceil(windowMs / 1000);
  const key = `vg:rl:${identifier}`;

  // Fallback to in-memory if Redis not configured
  if (!process.env.REDIS_URL) {
    return inMemoryRateLimit(identifier, limit, windowMs);
  }

  let client;
  try {
    client = getClient();
  } catch {
    return inMemoryRateLimit(identifier, limit, windowMs);
  }
  try {
    await client.connect();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSec);
    const ttl = await client.ttl(key);
    const resetAt = now + ttl * 1000;
    const remaining = Math.max(0, limit - count);
    return { allowed: count <= limit, remaining, resetAt };
  } catch {
    // Redis failure → fail open
    return { allowed: true, remaining: limit, resetAt: now + windowMs };
  } finally {
    await client.quit();
  }
}

// In-memory fallback for local dev
const _store = new Map<string, { count: number; resetAt: number }>();
function inMemoryRateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = _store.get(identifier);
  if (!record || now > record.resetAt) {
    _store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

export function getRateLimitHeaders(result: { allowed: boolean; remaining: number; resetAt: number }) {
  return {
    'X-RateLimit-Limit': '30',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
}
