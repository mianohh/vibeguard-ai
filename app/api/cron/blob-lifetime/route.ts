import { NextRequest, NextResponse } from 'next/server';
import { blobLifetimeCronJob } from '@/lib/walrus-lifetime';

/**
 * Cron endpoint for Walrus blob lifetime management
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/blob-lifetime",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org, EasyCron)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await blobLifetimeCronJob();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    console.error('Blob lifetime cron failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Manual trigger endpoint (for testing)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.API_KEYS?.split(',')[0];

  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await blobLifetimeCronJob();

    return NextResponse.json({
      success: true,
      message: 'Blob lifetime check completed',
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
