import { NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';
import { getCheckpointSequenceNumber } from '@/lib/sui-rpc';

export const dynamic = 'force-dynamic';

async function pingEnclave(): Promise<{ status: string; latency: number }> {
  const enclaveUrl = process.env.ENCLAVE_URL;
  if (!enclaveUrl) return { status: 'not_configured', latency: 0 };
  try {
    const parsed = new URL(enclaveUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return { status: 'misconfigured', latency: 0 };
      const t0 = Date.now();
      const res = await fetch(`${parsed.origin}/health_check`, { signal: AbortSignal.timeout(3000) });
      return { status: res.ok ? 'operational' : 'degraded', latency: Date.now() - t0 };
  } catch {
    return { status: 'unreachable', latency: 0 };
  }
}

async function pingSuiRpc(): Promise<{ status: string; latency: number }> {
  const t0 = Date.now();
  try {
    await getCheckpointSequenceNumber();
    return { status: 'operational', latency: Date.now() - t0 };
  } catch {
    return { status: 'degraded', latency: Date.now() - t0 };
  }
}

async function pingWalrus(): Promise<{ status: string; latency: number }> {
  // The aggregator root returns 404 — use a known-good blob read endpoint instead.
  // A 404 on a specific blob means the service is up; connection failure means down.
  const base = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
  const probeUrl = `${base}/v1/blobs/probe_ping_00000000000000000000000000000000`;
  try {
    const t0 = Date.now();
    const res = await fetch(probeUrl, { signal: AbortSignal.timeout(5000) });
    // 404 = service up, blob not found (expected). 200 = also fine.
    const up = res.status === 404 || res.status === 200 || res.status === 400;
    return { status: up ? 'operational' : 'degraded', latency: Date.now() - t0 };
  } catch {
    return { status: 'unreachable', latency: 0 };
  }
}

async function pingSealKeyServers(): Promise<{ status: string; latency: number }> {
  // Sui JSON-RPC is deprecated. Verify the Seal EnclaveConfig object via GraphQL,
  // which confirms the Seal policy infrastructure is reachable on-chain.
  const graphqlUrl = process.env.SUI_GRAPHQL_URL || 'https://graphql.testnet.sui.io/graphql';
  const enclaveConfigId = process.env.ENCLAVE_CONFIG_OBJECT_ID || '0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502';
  try {
    const t0 = Date.now();
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ object(address: "${enclaveConfigId}") { address } }`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    const found = json?.data?.object?.address === enclaveConfigId;
    return { status: found ? 'operational' : 'degraded', latency: Date.now() - t0 };
  } catch {
    return { status: 'unreachable', latency: 0 };
  }
}

export async function GET() {
  try {
    const [data, enclaveHealth, suiRpcHealth, walrusHealth, sealHealth] = await Promise.all([
      Promise.race([
        analytics.getData(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]),
      pingEnclave(),
      pingSuiRpc(),
      pingWalrus(),
      pingSealKeyServers(),
    ]);

    return NextResponse.json({
      status: 'operational',
      averageLatencyMs: suiRpcHealth.latency,
      totalTransactionsAnalyzed: data.totalScans,
      totalThreatsBlocked: data.scamsBlocked,
      lastChecked: new Date().toISOString(),
      components: {
        teeEnclave: {
          status: enclaveHealth.status,
          latency: enclaveHealth.latency,
          description: 'Nautilus enclave — TEE threat engine',
        },
        localThreatAgent: {
          status: 'operational',
          latency: null,
          description: 'Deterministic threat detection engine',
        },
        suiRpc: {
          status: suiRpcHealth.status,
          latency: suiRpcHealth.latency,
          description: 'Sui blockchain simulation layer',
        },
        walrusStorage: {
          status: walrusHealth.status,
          latency: walrusHealth.latency,
          description: 'Decentralized threat evidence storage',
        },
        sealEncryption: {
          status: sealHealth.status,
          latency: sealHealth.latency,
          description: 'Seal enclave config object on-chain',
        },
        reputationRegistry: {
          status: suiRpcHealth.status === 'operational' ? 'operational' : 'degraded',
          latency: suiRpcHealth.latency,
          description: 'On-chain malicious contract registry',
        },
      },
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({
      status: 'degraded',
      averageLatencyMs: null,
      totalTransactionsAnalyzed: 0,
      totalThreatsBlocked: 0,
      lastChecked: new Date().toISOString(),
      components: {
        teeEnclave: { status: 'unknown', latency: null, description: 'Nautilus enclave — TEE threat engine' },
        localThreatAgent: { status: 'unknown', latency: null, description: 'Deterministic threat detection engine' },
        suiRpc: { status: 'unknown', latency: null, description: 'Sui blockchain simulation layer' },
        walrusStorage: { status: 'unknown', latency: null, description: 'Decentralized threat evidence storage' },
        sealEncryption: { status: 'unknown', latency: null, description: 'Seal enclave config object on-chain' },
        reputationRegistry: { status: 'unknown', latency: null, description: 'On-chain malicious contract registry' },
      },
    });
  }
}
