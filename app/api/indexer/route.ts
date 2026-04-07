/**
 * Threat Indexer API
 * Manual trigger endpoint for re-indexing threats
 */

import { NextResponse } from 'next/server';
import { indexThreats, getThreatStats } from '@/lib/threat-indexer';

export async function POST() {
  try {
    const indexed = await indexThreats();
    const stats = getThreatStats();
    
    return NextResponse.json({
      success: true,
      indexed,
      stats,
    });
  } catch (error) {
    console.error('Indexer error:', error);
    return NextResponse.json(
      { error: 'Failed to index threats' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const stats = getThreatStats();
  return NextResponse.json(stats);
}
