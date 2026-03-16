/**
 * Walrus Decentralized Storage Integration
 * Publishes threat reports to Walrus and returns blob_id for on-chain storage
 */

const WALRUS_PUBLISHER_NODES = [
  'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5',
  'https://walrus-testnet-publisher.natsai.xyz/v1/blobs?epochs=5',
  'https://walrus-testnet-publisher.nodeinfra.com/v1/blobs?epochs=5',
];

const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

export interface ThreatReport {
  packageId: string;
  transactionBytes?: string;
  userIntent?: string;
  riskLevel: string;
  reasons: string[];
  headline: string;
  plainEnglish: string;
  recommendedAction: string;
  reportedAt: string;
  reportedBy: string;
}

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    encodedSize: number;
    cost: number;
  };
  alreadyCertified?: {
    blobId: string;
    event: any;
    endEpoch: number;
  };
}

/**
 * Publish a threat report to Walrus decentralized storage
 * @param reportData - The threat report data to store
 * @returns The Walrus blob_id for on-chain reference
 */
export async function publishThreatReportToWalrus(
  reportData: ThreatReport
): Promise<string> {
  const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], {
    type: 'application/json',
  });

  let lastError: Error | null = null;

  for (const publisherUrl of WALRUS_PUBLISHER_NODES) {
    try {
      console.log(`🔄 Attempting Walrus upload to: ${publisherUrl}`);

      const response = await fetch(publisherUrl, {
        method: 'PUT',
        body: reportBlob,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} - ${errorText}`);
      }

      const result: WalrusUploadResponse = await response.json();

      let blobId: string;
      
      if (result.newlyCreated) {
        blobId = result.newlyCreated.blobObject.blobId;
        console.log('✅ Threat report stored on Walrus:', {
          blobId,
          size: result.newlyCreated.blobObject.size,
          cost: result.newlyCreated.cost,
          node: publisherUrl,
        });
      } else if (result.alreadyCertified) {
        blobId = result.alreadyCertified.blobId;
        console.log('✅ Threat report already exists on Walrus:', blobId);
      } else {
        throw new Error('Unexpected Walrus response format');
      }

      return blobId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`⚠️ Failed to upload to ${publisherUrl}:`, lastError.message);
    }
  }

  console.error('❌ All Walrus publisher nodes failed');
  throw new Error(
    `Failed to publish threat report to Walrus: ${lastError?.message || 'All nodes unavailable'}`
  );
}

/**
 * Retrieve a threat report from Walrus using blob_id
 * @param blobId - The Walrus blob identifier
 * @returns The threat report data
 */
export async function retrieveThreatReportFromWalrus(
  blobId: string
): Promise<ThreatReport> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);

    if (!response.ok) {
      throw new Error(`Walrus retrieval failed: ${response.status}`);
    }

    const reportData: ThreatReport = await response.json();
    return reportData;
  } catch (error) {
    console.error('❌ Walrus retrieval error:', error);
    throw new Error(
      `Failed to retrieve threat report from Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a blob exists on Walrus
 * @param blobId - The Walrus blob identifier
 * @returns True if blob exists and is accessible
 */
export async function checkWalrusBlobExists(blobId: string): Promise<boolean> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}
