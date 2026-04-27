'use client';

import { useEffect, useState } from 'react';

interface StatusData {
  status: string;
  uptime: number;
  averageLatencyMs: number;
  totalTransactionsAnalyzed: number;
  totalThreatsBlocked: number;
  lastChecked: string;
  components: {
    [key: string]: {
      status: string;
      latency: number;
      description: string;
    };
  };
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="ocean-background" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-sui-cyan text-xl">Loading status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="sui-symbol w-12 h-12" />
            <h1 className="text-4xl font-display font-bold">
              <span className="gradient-text">VibeGuard Status</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Real-time system health and performance metrics
          </p>
        </div>

        {/* Hero Status Banner */}
        <div className="glass-card p-8 mb-12 text-center border-2 border-status-safe">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-4 h-4 rounded-full bg-status-safe animate-pulse-glow shadow-[0_0_20px_rgba(0,255,163,0.5)]" />
            <h2 className="text-3xl font-bold text-status-safe">
              All Systems Operational
            </h2>
          </div>
          <p className="text-gray-300 text-lg">
            VibeGuard infrastructure is running smoothly
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Last checked: {data ? new Date(data.lastChecked).toLocaleString() : 'N/A'}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {/* Uptime */}
          <div className="glass-card p-6 hover:border-sui-cyan transition-all">
            <div className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">
              Uptime
            </div>
            <div className="text-4xl font-bold text-status-safe mb-1">
              {data?.uptime}%
            </div>
            <div className="text-gray-500 text-xs">
              Last 30 days
            </div>
          </div>

          {/* Average Latency */}
          <div className="glass-card p-6 hover:border-sui-cyan transition-all">
            <div className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">
              Avg Latency
            </div>
            <div className="text-4xl font-bold text-sui-cyan mb-1">
              {data?.averageLatencyMs}ms
            </div>
            <div className="text-gray-500 text-xs">
              Threat detection speed
            </div>
          </div>

          {/* Total Scanned */}
          <div className="glass-card p-6 hover:border-sui-cyan transition-all">
            <div className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">
              Total Scanned
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {data?.totalTransactionsAnalyzed.toLocaleString()}
            </div>
            <div className="text-gray-500 text-xs">
              Transactions analyzed
            </div>
          </div>

          {/* Threats Blocked */}
          <div className="glass-card p-6 hover:border-sui-cyan transition-all">
            <div className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">
              Threats Blocked
            </div>
            <div className="text-4xl font-bold text-status-danger mb-1">
              {data?.totalThreatsBlocked.toLocaleString()}
            </div>
            <div className="text-gray-500 text-xs">
              Malicious transactions
            </div>
          </div>
        </div>

        {/* System Components */}
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-white mb-6">
            System Components
          </h3>
          
          <div className="space-y-4">
            {data && Object.entries(data.components).map(([key, component]) => (
              <div 
                key={key}
                className="flex items-center justify-between p-4 bg-ocean-mid/50 rounded-lg border border-ocean-surface hover:border-sui-cyan/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-status-safe animate-pulse-glow shadow-[0_0_12px_rgba(0,255,163,0.5)]" />
                  <div>
                    <div className="text-white font-semibold">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {component.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sui-cyan font-mono text-sm">
                      {component.latency}ms
                    </div>
                    <div className="text-gray-500 text-xs">
                      Response time
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-status-safe/20 border border-status-safe/50 rounded-full">
                    <span className="text-status-safe text-xs font-semibold uppercase">
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            For enterprise support and SLA inquiries, contact{' '}
            <a href="mailto:support@vibeguard.ai" className="text-sui-cyan hover:text-sui-aqua transition-colors">
              support@vibeguard.ai
            </a>
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <a href="/" className="text-gray-400 hover:text-sui-cyan transition-colors text-sm">
              ← Back to Console
            </a>
            <span className="text-gray-600">|</span>
            <a href="/api-docs" className="text-gray-400 hover:text-sui-cyan transition-colors text-sm">
              API Documentation
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
