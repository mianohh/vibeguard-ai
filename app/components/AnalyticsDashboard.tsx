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
      const res = await fetch(`/api/analytics?t=${Date.now()}`, { cache: 'no-store' });
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
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-4 bg-ocean-surface rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-ocean-surface rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
        <h2 className="text-2xl font-bold text-white">
          Live Impact Dashboard
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Scans */}
        <div className="glass-card p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Total Scans</span>
            <svg className="w-6 h-6 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-sui-blue">
            {data.totalScans.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">Transactions analyzed</div>
        </div>

        {/* Value Protected */}
        <div className="glass-card p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Value Protected</span>
            <svg className="w-6 h-6 text-status-safe" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-status-safe">
            {data.totalValueProtected.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} SUI
          </div>
          <div className="text-xs text-gray-500 mt-2">Assets saved from scams</div>
        </div>

        {/* Scams Blocked */}
        <div className="glass-card p-6 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Scams Blocked</span>
            <svg className="w-6 h-6 text-status-danger" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-status-danger">
            {data.scamsBlocked.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">Dangerous transactions flagged</div>
        </div>

      </div>
      <div className="text-center mt-4 text-xs text-gray-500">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}
