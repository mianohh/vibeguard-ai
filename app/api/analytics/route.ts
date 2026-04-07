import { NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';
import { getThreatStats } from '@/lib/threat-indexer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const analyticsData = await analytics.getData();
  const threatStats = getThreatStats();
  
  return NextResponse.json({
    ...analyticsData,
    threats: threatStats,
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
