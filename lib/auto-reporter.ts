const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://vibeguardai.vercel.app');

export async function autoReportThreat(
  maliciousPackageId: string,
  reasons: string[],
  _enclaveSignature?: string,
  _timestampMs?: number,
  nonce?: string
): Promise<void> {
  console.log(`Auto-reporting malicious package: ${maliciousPackageId}`);

  // Call /api/flush directly — proven to work end-to-end from Vercel.
  // The PTB batcher's Redis path has a 1s batch window that gets killed
  // by Vercel's function timeout before it can execute.
  try {
    const res = await fetch(`${BASE_URL}/api/flush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports: [{ maliciousPackageId, reasons, nonce }] }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`[auto-reporter] on-chain success digest=${data.digest}`);
    } else {
      console.error(`[auto-reporter] flush failed: ${data.error}`);
    }
    return;
  } catch (err: any) {
    console.error(`[auto-reporter] flush call failed: ${err.message}`);
  }
}
