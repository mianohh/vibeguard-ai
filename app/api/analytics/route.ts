import { NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';

export async function GET() {
  const data = analytics.getData();
  
  return NextResponse.json({
    totalScans: data.totalScans,
    totalValueProtected: data.totalValueProtected,
    scamsBlocked: data.scamsBlocked,
    lastUpdated: data.lastUpdated
  });
}
