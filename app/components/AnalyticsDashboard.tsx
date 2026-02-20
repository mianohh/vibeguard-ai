'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  totalScans: number;
  totalValueProtected: number;
  scamsBlocked: number;
  lastUpdated: string;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const analytics = await res.json();
      setData(analytics);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[1, 2, 3].map(i => (
          <div key={i} className="security-surface p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">
        📊 Live Impact Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Scans */}
        <div className="security-surface p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Total Scans</span>
            <span className="text-2xl">🔍</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {data.totalScans.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">Transactions analyzed</div>
        </div>

        {/* Value Protected */}
        <div className="security-surface p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Value Protected</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {data.totalValueProtected.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} SUI
          </div>
          <div className="text-xs text-slate-500 mt-2">Assets saved from scams</div>
        </div>

        {/* Scams Blocked */}
        <div className="security-surface p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Scams Blocked</span>
            <span className="text-2xl">🛡️</span>
          </div>
          <div className="text-3xl font-bold text-red-400">
            {data.scamsBlocked.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">Dangerous transactions flagged</div>
        </div>

      </div>
      <div className="text-center mt-4 text-xs text-slate-500">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}
