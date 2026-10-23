'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2, Radio } from 'lucide-react';
import StatTile from '@/app/components/ui/StatTile';
import StatusPill, { levelTone, toneTextClass } from '@/app/components/ui/StatusPill';
import { EmptyState, Skeleton } from '@/app/components/ui/Skeleton';
import CodeBlock from '@/app/components/ui/CodeBlock';
import SectionHeading from '@/app/components/ui/SectionHeading';

interface ThreatStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface Threat {
  packageId: string;
  category?: string;
  severity?: string;
  timestamp: number;
  txDigest: string;
  reasons?: string[];
}

const sampleCode = `// Subscribe to threat feed (Sui GraphQL)
const GRAPHQL_URL = 'https://graphql.testnet.sui.io/graphql';

async function pollThreats() {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '{ events(last: 10, filter: { type: "0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de::registry::ThreatReported" }) { edges { node { contents { json } } } } }',
    }),
  });
  const { data } = await res.json();
  for (const { node } of data.events.edges) {
    const { malicious_package_id, walrus_blob_id } = node.contents.json;
    // handle new threat
    onThreat({ malicious_package_id, walrus_blob_id });
  }
}

setInterval(pollThreats, 15000);`;

export default function DashboardPage() {
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, threatsRes] = await Promise.all([
          fetch('/api/threats?stats=true'),
          fetch('/api/threats?limit=10'),
        ]);
        const statsData = await statsRes.json();
        const threatsData = await threatsRes.json();
        setStats(statsData.stats);
        setThreats(threatsData.threats || []);
      } catch {
        /* keep last snapshot */
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="shell py-10 lg:py-14 max-w-5xl">
      <SectionHeading
        kicker="Real-time intelligence"
        title="Threat intelligence dashboard"
        lede={
          <>
            Community and engine reports, as they land on-chain · refreshes every 30 seconds{' '}
            <span className="font-mono text-[13px] text-faint">
              · updated {new Date().toLocaleTimeString()}
            </span>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatTile
          label="total threats"
          value={stats?.total ?? '—'}
          hint="flagged to the on-chain registry"
        />
        <div className="surface rounded-[var(--radius-tile)] px-5 py-[18px]">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">by category</div>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(stats?.byCategory || {}).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-[13px]">
                  <span className="text-mid">{cat}</span>
                  <span className="font-mono text-sui tabular">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="surface rounded-[var(--radius-tile)] px-5 py-[18px]">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">by severity</div>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(stats?.bySeverity || {}).map(([sev, count]) => (
                <div key={sev} className="flex justify-between text-[13px]">
                  <span className="text-mid">{sev}</span>
                  <span className={`font-mono tabular ${toneTextClass(levelTone(sev))}`}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="surface overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sui flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 animate-pulse-dot" strokeWidth={1.75} />
              live feed
            </p>
            <h2 className="text-[18px] mt-1">Recent threats</h2>
          </div>
          <a
            href="https://suiscan.xyz/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11.5px] text-low hover:text-sui transition-colors flex items-center gap-1"
          >
            suiscan <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </a>
        </div>

        <div className="divide-y divide-line-soft">
          {loading && (
            <div className="p-5 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          )}

          {!loading && threats.length === 0 && (
            <EmptyState
              title="No threats yet"
              body="The registry is empty on this network. First report becomes the first row."
            />
          )}

          {!loading &&
            threats.map((threat) => (
              <div
                key={`${threat.packageId}-${threat.timestamp}`}
                className="p-5 hover:bg-surface-2/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="font-mono text-[13px] text-aqua break-all">
                    {threat.packageId.slice(0, 24)}…
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {threat.category && <StatusPill label={threat.category} tone="brand" />}
                    {threat.severity && <StatusPill label={threat.severity} />}
                  </div>
                </div>
                {threat.reasons && (
                  <div className="text-[13.5px] text-mid mb-2">{threat.reasons.join(' · ')}</div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-[12px] text-low font-mono">
                  <span>{new Date(threat.timestamp).toLocaleString()}</span>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${threat.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sui hover:text-aqua transition-colors flex items-center gap-1"
                  >
                    view tx <ArrowUpRight className="w-3 h-3" strokeWidth={1.75} />
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>

      <details className="surface p-5 mt-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold">Integration example</h3>
          <span className="font-mono text-[11px] text-sui group-open:hidden">SHOW →</span>
          <span className="font-mono text-[11px] text-sui hidden group-open:inline">HIDE</span>
        </summary>
        <CodeBlock code={sampleCode} title="poll-threats.ts" className="mt-4" />
      </details>
    </div>
  );
}
