import { NextResponse } from 'next/server';
import { queryThreats } from '@/lib/threat-indexer';
import { checkMultipleBlobsExpiration } from '@/lib/walrus-monitor';

export async function GET() {
  try {
    const threats = queryThreats({ limit: 1000 });
    const blobsWithEpoch = threats
      .filter(t => t.endEpoch)
      .map(t => ({ blobId: t.blobId, endEpoch: t.endEpoch! }));

    if (blobsWithEpoch.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blobs with expiration data',
        total: 0,
      });
    }

    const statuses = await checkMultipleBlobsExpiration(blobsWithEpoch);
    
    const expired = Array.from(statuses.values()).filter(s => s.isExpired).length;
    const expiring = Array.from(statuses.values()).filter(s => s.needsRenewal).length;
    const healthy = blobsWithEpoch.length - expired - expiring;

    return NextResponse.json({
      success: true,
      total: blobsWithEpoch.length,
      healthy,
      expiring,
      expired,
      details: Array.from(statuses.entries()).map(([blobId, status]) => ({
        blobId,
        ...status,
      })),
    });
  } catch (error) {
    console.error('Blob health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
