import { NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await analytics.getData();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
