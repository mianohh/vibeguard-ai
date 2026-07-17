/**
 * Walrus Decentralized Storage Integration
 * Publishes threat reports to Walrus and returns blob_id for on-chain storage
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// Walrus publisher and aggregator URLs - can be overridden via environment variables
const WALRUS_NETWORK = process.env.WALRUS_NETWORK || 'testnet';
const WALRUS_BASE_URL = process.env.WALRUS_PUBLISHER_URL || `https://publisher.walrus-${WALRUS_NETWORK}.walrus.space`;
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || `https://aggregator.walrus-${WALRUS_NETWORK}.walrus.space`;

const WALRUS_PUBLISHER_NODES = [
  `${WALRUS_BASE_URL}/v1/blobs?epochs=5`,
  'https://walrus-testnet-publisher.natsai.xyz/v1/blobs?epochs=5',
  'https://walrus-testnet-publisher.nodeinfra.com/v1/blobs?epochs=5',
];

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
  endEpoch?: number;
  metadata?: {
    title: string;
    publisher: string;
    category: 'Honeypot' | 'Phishing' | 'Rug Pull' | 'Intent Mismatch' | 'Unknown';
    tags?: string[];
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    timestamp: string;
  };
}

export interface WalrusBlobResult {
  blobId: string;
  blobObjectId: string;
  endEpoch?: number; // Blob expiration epoch
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
    blobObject?: { id: string };
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
): Promise<WalrusBlobResult> {
  const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], {
    type: 'application/json',
  });

  let lastError: Error | null = null;

  for (const publisherUrl of WALRUS_PUBLISHER_NODES) {
    try {
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
      let blobObjectId: string;

      if (result.newlyCreated) {
        const blobId = result.newlyCreated.blobObject.blobId;
        const blobObjectId = result.newlyCreated.blobObject.id;
        const endEpoch = result.newlyCreated.blobObject.storage.endEpoch;
        console.log('✅ Walrus Upload Success | Blob ID:', blobId, '| Sui-Linked Blob Object ID:', blobObjectId, '| Expires at epoch:', endEpoch);
        return { blobId, blobObjectId, endEpoch };
      } else if (result.alreadyCertified) {
        const blobId = result.alreadyCertified.blobId;
        const blobObjectId = result.alreadyCertified.blobObject?.id ?? blobId;
        const endEpoch = result.alreadyCertified.endEpoch;
        console.log('✅ Walrus Upload Success | Blob ID:', blobId, '| Sui-Linked Blob Object ID:', blobObjectId, '| Expires at epoch:', endEpoch);
        return { blobId, blobObjectId, endEpoch };
      } else {
        throw new Error('Unexpected Walrus response format');
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`⚠️ Failed to upload to ${publisherUrl}:`, lastError.message);
    }
  }

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
 * Check if a Walrus Blob NFT is live on Sui (object exists and is accessible)
 * @param blobObjectId - The Sui object ID of the Blob NFT
 * @returns True if the blob object exists on-chain
 */
export async function checkBlobLiveness(blobObjectId: string): Promise<boolean> {
  try {
    const object = await suiClient.getObject({ id: blobObjectId });
    return object.data != null && !('error' in object);
  } catch {
    return false;
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
