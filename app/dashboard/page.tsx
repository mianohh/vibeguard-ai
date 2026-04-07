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
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Threat Intelligence Dashboard</h1>
          <p className="text-gray-400">Real-time security feed for Sui ecosystem</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Total Threats</div>
            <div className="text-4xl font-bold text-red-400">{stats?.total || 0}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Categories</div>
            <div className="space-y-1">
              {Object.entries(stats?.byCategory || {}).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Severity</div>
            <div className="space-y-1">
              {Object.entries(stats?.bySeverity || {}).map(([sev, count]) => (
                <div key={sev} className="flex justify-between text-sm">
                  <span>{sev}</span>
                  <span className="text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold">Recent Threats</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {threats.map((threat) => (
              <div key={threat.packageId} className="p-6 hover:bg-gray-750">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-sm text-gray-400">
                    {threat.packageId.slice(0, 20)}...
                  </div>
                  <div className="flex gap-2">
                    {threat.category && (
                      <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
                        {threat.category}
                      </span>
                    )}
                    {threat.severity && (
                      <span className="px-2 py-1 bg-orange-900/30 text-orange-400 text-xs rounded">
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
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{new Date(threat.timestamp).toLocaleString()}</span>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${threat.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View on Suiscan →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4">Integration Example</h3>
          <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
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
    console.log('🚨 New threat detected:', malicious_package_id);
  }
});`}
          </pre>
        </div>
      </div>
    </div>
  );
}
