import { NextRequest, NextResponse } from 'next/server';
import { checkAndExtendThreats } from '@/lib/walrus-lifetime';

/**
 * GET /api/blob-health
 * 
 * Returns current status of all Walrus blobs in the threat registry
 */
export async function GET(req: NextRequest) {
  try {
    const result = await checkAndExtendThreats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalBlobs: result.checked,
        healthy: result.checked - result.warnings.length,
        needsAttention: result.warnings.length,
        failed: result.failed
      },
      warnings: result.warnings.map(w => ({
        blobId: w.blobId,
        epochsRemaining: w.epochsRemaining,
        severity: w.severity,
        expirationEpoch: w.expirationEpoch
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
