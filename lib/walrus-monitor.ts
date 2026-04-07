/**
 * Walrus Blob Lifetime Monitoring
 * Tracks blob expiration and provides proactive re-upload warnings
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export interface BlobLifetimeStatus {
  isExpired: boolean;
  epochsRemaining: number;
  currentEpoch: number;
  endEpoch: number;
  needsRenewal: boolean; // True if < 10 epochs remaining
}

/**
 * Check blob expiration status
 * @param endEpoch - The epoch when the blob expires (from Walrus upload response)
 * @returns Detailed lifetime status
 */
export async function checkBlobExpiration(endEpoch: number): Promise<BlobLifetimeStatus> {
  const systemState = await suiClient.getLatestSuiSystemState();
  const currentEpoch = Number(systemState.epoch);
  const epochsRemaining = endEpoch - currentEpoch;

  return {
    isExpired: epochsRemaining <= 0,
    epochsRemaining: Math.max(0, epochsRemaining),
    currentEpoch,
    endEpoch,
    needsRenewal: epochsRemaining > 0 && epochsRemaining < 10, // Warn if < 10 epochs left
  };
}

/**
 * Batch check multiple blobs for expiration
 * @param blobs - Array of { blobId, endEpoch } objects
 * @returns Map of blobId to lifetime status
 */
export async function checkMultipleBlobsExpiration(
  blobs: Array<{ blobId: string; endEpoch: number }>
): Promise<Map<string, BlobLifetimeStatus>> {
  const systemState = await suiClient.getLatestSuiSystemState();
  const currentEpoch = Number(systemState.epoch);

  const results = new Map<string, BlobLifetimeStatus>();

  for (const blob of blobs) {
    const epochsRemaining = blob.endEpoch - currentEpoch;
    results.set(blob.blobId, {
      isExpired: epochsRemaining <= 0,
      epochsRemaining: Math.max(0, epochsRemaining),
      currentEpoch,
      endEpoch: blob.endEpoch,
      needsRenewal: epochsRemaining > 0 && epochsRemaining < 10,
    });
  }

  return results;
}

/**
 * Get human-readable time estimate for epochs remaining
 * @param epochsRemaining - Number of epochs until expiration
 * @returns Approximate time string (assumes ~24h per epoch)
 */
export function getTimeEstimate(epochsRemaining: number): string {
  if (epochsRemaining <= 0) return 'Expired';
  if (epochsRemaining === 1) return '~1 day';
  if (epochsRemaining < 7) return `~${epochsRemaining} days`;
  if (epochsRemaining < 30) return `~${Math.floor(epochsRemaining / 7)} weeks`;
  return `~${Math.floor(epochsRemaining / 30)} months`;
}
