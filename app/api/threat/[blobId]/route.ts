import { checkBlobLiveness, retrieveThreatReportFromWalrus } from '@/lib/walrus';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params;
  const url = new URL(req.url);
  const blobObjectId = url.searchParams.get('blobObjectId');

  if (!blobId) {
    return Response.json({ error: 'blobId is required' }, { status: 400 });
  }

  try {
    // If blobObjectId provided, verify the Blob NFT is live on Sui before fetching
    if (blobObjectId) {
      const isLive = await checkBlobLiveness(blobObjectId);
      if (!isLive) {
        return Response.json(
          { error: 'Blob NFT is no longer live on Sui — storage epoch may have expired' },
          { status: 410 }
        );
      }
    }

    const report = await retrieveThreatReportFromWalrus(blobId);
    return Response.json(report, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    return Response.json(
      { error: `Failed to retrieve threat report: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 404 }
    );
  }
}
