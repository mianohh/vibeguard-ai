'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import StatusPill, { levelTone } from '@/app/components/ui/StatusPill';
import StatTile from '@/app/components/ui/StatTile';
import SectionHeading from '@/app/components/ui/SectionHeading';
import { Skeleton } from '@/app/components/ui/Skeleton';

interface ComponentStatus {
  status: string;
  latency: number | null;
  description: string;
}

interface StatusData {
  status: string;
  averageLatencyMs: number | null;
  totalTransactionsAnalyzed: number;
  totalThreatsBlocked: number;
  lastChecked: string;
  components: Record<string, ComponentStatus>;
}

const componentLabels: Record<string, string> = {
  teeEnclave: 'TEE enclave',
  localThreatAgent: 'Threat engine',
  suiRpc: 'Sui RPC',
  walrusStorage: 'Walrus storage',
  sealEncryption: 'Seal encryption',
  reputationRegistry: 'Reputation registry',
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const overall = data?.status || 'operational';

  return (
    <div className="shell py-10 lg:py-14 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-9">
        <SectionHeading
          kicker="System status"
          title={error ? 'Status unavailable' : overall === 'operational' ? 'All systems operational' : 'Partial disruption'}
          lede={
            data
              ? `Live health of every layer in the pipeline · last checked ${new Date(data.lastChecked).toLocaleTimeString()}`
              : 'Querying every layer of the pipeline…'
          }
        />
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-[13px] text-low border border-line rounded-[var(--radius-ctl)] px-4 py-2.5 hover:text-hi hover:border-sui/40 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="border border-danger-line bg-danger-soft rounded-[var(--radius-card)] px-5 py-4 text-[14px] text-mid mb-6" role="alert">
          Could not reach the status endpoint. This page itself is served; the issue is one of the
          upstream checks.
        </div>
      )}

      <div
        className={`flex items-center gap-4 px-5 py-4 rounded-[var(--radius-card)] border mb-6 ${
          levelTone(overall) === 'safe'
            ? 'bg-safe-soft border-safe-line'
            : levelTone(overall) === 'warn'
              ? 'bg-warn-soft border-warn-line'
              : 'bg-danger-soft border-danger-line'
        }`}
        role="status"
      >
        <span
          className={`w-3 h-3 rounded-full flex-shrink-0 animate-pulse-dot ${
            levelTone(overall) === 'safe' ? 'bg-safe' : levelTone(overall) === 'warn' ? 'bg-warn' : 'bg-danger'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-hi font-semibold text-[15px] capitalize">{overall.replace('_', ' ')}</p>
          <p className="font-mono text-[11.5px] text-low">
            {data
              ? `median latency ${data.averageLatencyMs != null ? `${data.averageLatencyMs}ms` : '—'}`
              : 'running checks…'}
          </p>
        </div>
        <StatusPill label={overall} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5 mb-6">
        <StatTile
          label="transactions analyzed"
          value={data ? data.totalTransactionsAnalyzed.toLocaleString() : '—'}
        />
        <StatTile
          label="threats blocked"
          value={data ? data.totalThreatsBlocked.toLocaleString() : '—'}
        />
      </div>

      <div className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-low">Components</p>
        </div>
        <div className="divide-y divide-line-soft">
          {!data &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}

          {data &&
            Object.entries(data.components).map(([key, comp]) => (
              <div key={key} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[14.5px] text-hi font-medium">
                    {componentLabels[key] || key}
                  </p>
                  <p className="text-[12.5px] text-low">{comp.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[12px] text-faint tabular">
                    {comp.latency ? `${comp.latency}ms` : '—'}
                  </span>
                  <StatusPill label={comp.status} />
                </div>
              </div>
            ))}
        </div>
      </div>

      <p className="mt-5 font-mono text-[11.5px] text-faint text-center">
        checks run server-side every 30 seconds · this page polls every 30 seconds
      </p>
    </div>
  );
}
