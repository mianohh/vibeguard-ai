#!/usr/bin/env tsx
/**
 * VibeGuard Enclave Load Test
 *
 * Benchmarks the production AWS Nitro Enclave at increasing concurrency levels.
 * Validates throughput, latency distribution, and error rate against defined thresholds.
 *
 * Usage:
 *   npx tsx scripts/load-test-enclave.ts
 *   ENCLAVE_URL=http://... npx tsx scripts/load-test-enclave.ts
 *
 * Exit codes:
 *   0 — All thresholds passed
 *   1 — One or more thresholds breached
 */

import { performance } from 'perf_hooks';

const ENCLAVE_URL = process.env.ENCLAVE_URL || 'http://98.82.186.207:3000';
const DURATION_MS = 30_000;
const CONCURRENCY_LEVELS = [1, 5, 10, 25, 50];
const REQUEST_TIMEOUT_MS = 10_000;

// Pass/fail thresholds
const THRESHOLDS = {
  maxErrorRate: 1,       // %
  maxP95Ms: 1_000,       // ms
  minThroughput: 4,      // req/s at concurrency 1
};

interface Result {
  concurrency: number;
  total: number;
  success: number;
  failed: number;
  rps: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  errorRate: number;
}

const PAYLOAD = {
  payload: {
    transaction_bytes: 'AAACAA==',
    user_intent: 'Claim airdrop',
    user_address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    network: 'testnet',
    simulation_result: {
      asset_flows: [{
        asset_type: '0x2::sui::SUI',
        direction: 'OUT',
        amount: 1_000_000_000,
        sender: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        recipient: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      }],
      move_calls: [{
        package: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        module: 'honeypot',
        function: 'drain',
      }],
      gas_budget: 10_000_000,
    },
  },
};

async function request(): Promise<{ ok: boolean; ms: number }> {
  const t = performance.now();
  try {
    const res = await fetch(`${ENCLAVE_URL}/process_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOAD),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const ms = performance.now() - t;
    if (!res.ok) return { ok: false, ms };
    await res.json();
    return { ok: true, ms };
  } catch {
    return { ok: false, ms: performance.now() - t };
  }
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.floor(sorted.length * p)] ?? 0;
}

async function runLevel(concurrency: number): Promise<Result> {
  const times: number[] = [];
  let success = 0;
  let failed = 0;
  const deadline = Date.now() + DURATION_MS;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (Date.now() < deadline) {
        const { ok, ms } = await request();
        times.push(ms);
        ok ? success++ : failed++;
      }
    })
  );

  const total = success + failed;
  const sorted = [...times].sort((a, b) => a - b);

  return {
    concurrency,
    total,
    success,
    failed,
    rps: total / (DURATION_MS / 1_000),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    p50: percentile(sorted, 0.50),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    errorRate: (failed / total) * 100,
  };
}

function row(r: Result): string {
  return (
    r.concurrency.toString().padStart(11) + ' | ' +
    r.rps.toFixed(2).padStart(8) + ' | ' +
    r.avg.toFixed(0).padStart(8) + ' | ' +
    r.p50.toFixed(0).padStart(8) + ' | ' +
    r.p95.toFixed(0).padStart(8) + ' | ' +
    r.p99.toFixed(0).padStart(8) + ' | ' +
    r.errorRate.toFixed(2).padStart(8)
  );
}

async function main() {
  const sep = '─'.repeat(88);

  console.log(sep);
  console.log('  VibeGuard Production Enclave — Load Test');
  console.log(sep);
  console.log(`  Endpoint  : ${ENCLAVE_URL}`);
  console.log(`  Duration  : ${DURATION_MS / 1_000}s per level`);
  console.log(`  Levels    : ${CONCURRENCY_LEVELS.join(', ')} concurrent`);
  console.log(sep);

  // Health check
  process.stdout.write('  Health check ... ');
  try {
    const res = await fetch(`${ENCLAVE_URL}/health_check`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json() as any;
    console.log(`ok  (pk: ${String(body.pk ?? '').slice(0, 16)}...)`);
  } catch (err) {
    console.log(`FAILED — ${err}`);
    process.exit(1);
  }

  console.log();
  console.log(' Concurrency |    Req/s |  Avg(ms) |  P50(ms) |  P95(ms) |  P99(ms) | Error(%)');
  console.log(sep);

  const results: Result[] = [];

  for (const c of CONCURRENCY_LEVELS) {
    process.stdout.write(`  Running concurrency=${c} ...`);
    const r = await runLevel(c);
    results.push(r);
    process.stdout.write('\r');
    console.log(row(r));
  }

  console.log(sep);

  // Threshold validation
  const violations: string[] = [];

  for (const r of results) {
    if (r.errorRate > THRESHOLDS.maxErrorRate) {
      violations.push(`Concurrency ${r.concurrency}: error rate ${r.errorRate.toFixed(2)}% > ${THRESHOLDS.maxErrorRate}%`);
    }
    if (r.p95 > THRESHOLDS.maxP95Ms) {
      violations.push(`Concurrency ${r.concurrency}: P95 ${r.p95.toFixed(0)}ms > ${THRESHOLDS.maxP95Ms}ms`);
    }
  }

  const baseline = results[0];
  if (baseline.rps < THRESHOLDS.minThroughput) {
    violations.push(`Baseline throughput ${baseline.rps.toFixed(2)} req/s < ${THRESHOLDS.minThroughput} req/s`);
  }

  const peak = results.reduce((a, b) => a.rps > b.rps ? a : b);

  console.log();
  console.log('  Summary');
  console.log(sep);
  console.log(`  Peak throughput : ${peak.rps.toFixed(2)} req/s at concurrency ${peak.concurrency}`);
  console.log(`  Stable avg      : ${(results.reduce((a, b) => a + b.avg, 0) / results.length).toFixed(0)}ms across all levels`);
  console.log(`  Max error rate  : ${Math.max(...results.map(r => r.errorRate)).toFixed(2)}%`);
  console.log();

  if (violations.length === 0) {
    console.log('  Result: PASS — all thresholds met');
  } else {
    console.log('  Result: FAIL — threshold violations:');
    violations.forEach(v => console.log(`    - ${v}`));
    process.exit(1);
  }

  console.log(sep);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
