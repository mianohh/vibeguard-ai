'use client';

import { useEffect, useState } from 'react';
import StatTile from '@/app/components/ui/StatTile';

interface AnalyticsData {
  totalScans?: number;
  totalValueProtected?: number | string;
}

export default function StatsStrip() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/analytics?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (alive) setData(json);
      } catch {
        /* keep static fallback */
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const fmt = (n?: number) => (n == null ? '—' : n.toLocaleString());

  return (
    <section className="pb-14 lg:pb-20">
      <div className="shell grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatTile label="Transactions analyzed" value={fmt(data?.totalScans)} hint="cumulative" />
        <StatTile label="Risk indicators per analysis" value="13" hint="deterministic checks" />
        <StatTile label="Analysis record" value="Signed" hint="verifiable on-chain" />
        <StatTile label="Average analysis time" value="~2s" hint="gRPC simulation" />
      </div>
    </section>
  );
}
