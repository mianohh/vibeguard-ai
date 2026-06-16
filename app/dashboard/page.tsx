'use client';

import { useEffect, useState } from 'react';

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

export default function DashboardPage() {
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [statsRes, threatsRes] = await Promise.all([
        fetch('/api/threats?stats=true'),
        fetch('/api/threats?limit=10')
      ]);
      
      const statsData = await statsRes.json();
      const threatsData = await threatsRes.json();
      
      setStats(statsData.stats);
      setThreats(threatsData.threats);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="ocean-background" />
        <div className="purple-section-blur" />
        <div className="relative z-10 container mx-auto px-4 py-6 lg:py-10 max-w-5xl section-divider">
          <h1 className="text-3xl font-bold text-white mb-8">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      <div className="purple-section-blur" />
      
      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-10 max-w-5xl section-divider">
        <div className="mb-8">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Real-Time Intelligence</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Threat Intelligence Dashboard</h1>
          <p className="text-lightblue">Real-time security feed for Sui ecosystem</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-card stat-card-purple p-5">
            <div className="text-primary text-sm font-semibold mb-2">Total Threats</div>
            <div className="text-3xl font-bold text-status-danger">{stats?.total || 0}</div>
          </div>

          <div className="glass-card stat-card-purple p-5">
            <div className="text-primary text-sm font-semibold mb-2">Categories</div>
            <div className="space-y-1">
              {Object.entries(stats?.byCategory || {}).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-sm text-gray-300">
                  <span>{cat}</span>
                  <span className="text-lightblue">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card stat-card-purple p-5">
            <div className="text-primary text-sm font-semibold mb-2">Severity</div>
            <div className="space-y-1">
              {Object.entries(stats?.bySeverity || {}).map(([sev, count]) => (
                <div key={sev} className="flex justify-between text-sm text-gray-300">
                  <span>{sev}</span>
                  <span className="text-lightblue">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">Live Feed</p>
            <h2 className="text-xl font-bold text-white">Recent Threats</h2>
          </div>
          <div className="divide-y divide-border">
            {threats.map((threat) => (
              <div key={threat.packageId} className="p-5 hover:bg-ocean-mid/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                  <div className="font-mono text-sm text-lightblue break-all">
                    {threat.packageId.slice(0, 20)}...
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {threat.category && (
                      <span className="px-2 py-1 bg-status-danger/20 text-status-danger text-xs rounded">
                        {threat.category}
                      </span>
                    )}
                    {threat.severity && (
                      <span className="px-2 py-1 bg-status-warning/20 text-status-warning text-xs rounded">
                        {threat.severity}
                      </span>
                    )}
                  </div>
                </div>
                {threat.reasons && (
                  <div className="text-sm text-gray-300 mb-2">
                    {threat.reasons.join(' • ')}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-lightblue">
                  <span>{new Date(threat.timestamp).toLocaleString()}</span>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${threat.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sui-cyan hover:text-sui-aqua"
                  >
                    View on Suiscan →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Integration Example</h3>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot red" />
              <div className="terminal-dot yellow" />
              <div className="terminal-dot green" />
            </div>
            <pre className="terminal-body overflow-x-auto text-xs">
{`// Subscribe to threat feed
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ 
  url: 'https://fullnode.testnet.sui.io' 
});

client.subscribeEvent({
  filter: {
    MoveEventType: '${process.env.NEXT_PUBLIC_PACKAGE_ID}::registry::ThreatReported'
  },
  onMessage: async (event) => {
    const { malicious_package_id, walrus_blob_id } = event.parsedJson;
    console.log('New threat detected:', malicious_package_id);
  }
});`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
