import { NextRequest, NextResponse } from 'next/server';
import { queryThreats, getThreatStats, indexThreats, getThreatByPackageId } from '@/lib/threat-indexer';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const rl = rateLimit(ip, 100, 60000);

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Refresh index if requested
    if (searchParams.get('refresh') === 'true') {
      await indexThreats();
    }

    // Return stats if requested
    if (searchParams.get('stats') === 'true') {
      const stats = getThreatStats();
      return NextResponse.json({ success: true, stats });
    }

    // Get specific threat by package ID
    const packageId = searchParams.get('packageId');
    if (packageId) {
      const threat = getThreatByPackageId(packageId);
      if (!threat) {
        return NextResponse.json(
          { success: false, error: 'Threat not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, threat });
    }

    // Query with filters
    const category = searchParams.get('category') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const threats = queryThreats({
      category: category as any,
      severity: severity as any,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      threats,
      count: threats.length,
      offset,
      limit,
    });
  } catch (error) {
    console.error('Threat query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
      },
      { status: 500 }
    );
  }
}
