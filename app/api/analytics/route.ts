import { NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';

export async function GET() {
  const data = await analytics.getData();
  return NextResponse.json(data);
}
