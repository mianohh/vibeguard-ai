/**
 * Enclave Client Wrapper
 * 
 * Provides a clean interface for calling the Nautilus enclave endpoints.
 * Automatically switches between local stub and real enclave based on env var.
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Configure @noble/ed25519 to use @noble/hashes SHA-512 (required for verify)
(ed25519 as any).etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...m));

const ENCLAVE_URL = process.env.NEXT_PUBLIC_ENCLAVE_URL || process.env.ENCLAVE_URL || 'http://136.112.189.77:3000';

export interface ThreatAnalysisPayload {
  transactionBytes: string;
  userIntent: string;
  userAddress?: string;
  network?: string;
}

export interface ThreatAnalysisPayloadWithSimulation extends ThreatAnalysisPayload {
  assetFlows: Array<{
    asset_type: string;
    direction: string;
    amount: number;
    sender: string | null;
    recipient: string | null;
  }>;
  moveCalls: Array<{
    package: string;
    module: string;
    function: string;
  }>;
  gasBudget: number;
}

export interface ThreatAnalysisResult {
  riskLevel: string;
  headline: string;
  plainEnglish: string;
  reasons: string[];
  recommendedAction: string;
  timestampMs: number;
}

export interface SignedEnclaveResponse {
  response: ThreatAnalysisResult;
  signature: string;
}

export interface EnclaveAttestation {
  public_key: string;
  pcr0: string;
  pcr1: string;
  pcr2: string;
  provider: 'simulation' | 'gcp_sev' | 'aws_nitro';
  mode: 'Simulation' | 'GcpSev' | 'AwsNitro';
  attestation_document: string | null;
}

export type AttestationResponse = EnclaveAttestation;

export class EnclaveClient {
  private baseUrl: string;
  private useStub: boolean;

  constructor(url: string = ENCLAVE_URL) {
    this.baseUrl = url.replace(/\/$/, '');
    this.useStub = !this.baseUrl;

    if (this.useStub) {
      console.log('EnclaveClient: stub mode (no ENCLAVE_URL set)');
    } else {
      console.log(`EnclaveClient: connected to ${this.baseUrl}`);
    }
  }

  /**
   * Call /process_data endpoint to analyze a transaction
   * Returns signed response from enclave
   */
  async processData(payload: ThreatAnalysisPayload): Promise<SignedEnclaveResponse> {
    if (this.useStub) {
      return this.processDataStub(payload);
    }

    // Format payload for production enclave
    const enclavePayload = {
      payload: {
        transaction_bytes: payload.transactionBytes,
        user_intent: payload.userIntent,
        user_address: payload.userAddress || '0x0',
        network: payload.network || 'testnet',
        simulation_result: {
          asset_flows: [], // Will be populated by caller if available
          move_calls: [], // Will be populated by caller if available
          gas_budget: 10000000,
        },
      },
    };

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/process_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enclavePayload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Enclave /process_data failed: ${error}`);
      }

      const raw = await response.json();

      // Map snake_case enclave response to camelCase interface
      const result: SignedEnclaveResponse = {
        response: {
          riskLevel: raw.response.risk_level,
          headline: raw.response.headline,
          plainEnglish: raw.response.headline,
          reasons: raw.response.flags || [],
          recommendedAction: raw.response.risk_level === 'RED' ? 'Do Not Sign' : 'Review carefully',
          timestampMs: raw.response.timestamp_ms,
        },
        // Convert hex signature to base64 for on-chain submission
        signature: Buffer.from(raw.signature, 'hex').toString('base64'),
      };

      // Verify enclave signature before returning
      const valid = await this.verifyEnclaveSignature(
        result.response,
        result.signature,
        raw.response.malicious_package_id,
        raw.response.walrus_blob_id,
      );
      if (!valid) {
        console.error('🚨 Enclave signature verification FAILED');
      }

      return result;
    } catch (error) {
      console.error('🚨 Enclave Connection Error [processData]:', error);
      throw error;
    }
  }

  /**
   * Call /process_data with full simulation data for accurate threat detection
   */
  private async fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
    const TIMEOUT_MS = 10_000;
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid enclave URL protocol');
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        if (attempt === retries) throw new Error(`Enclave unreachable after ${retries + 1} attempts: ${err.message}`);
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    throw new Error('Enclave fetch failed');
  }

  async processDataWithSimulation(payload: ThreatAnalysisPayloadWithSimulation): Promise<SignedEnclaveResponse> {
    if (this.useStub) {
      return this.processDataStub(payload);
    }

    const enclavePayload = {
      payload: {
        transaction_bytes: payload.transactionBytes,
        user_intent: payload.userIntent,
        user_address: payload.userAddress || '0x0',
        network: payload.network || 'testnet',
        simulation_result: {
          asset_flows: payload.assetFlows,
          move_calls: payload.moveCalls,
          gas_budget: payload.gasBudget,
        },
      },
    };

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/process_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enclavePayload),
      });

      if (!response.ok) {
        throw new Error(`Enclave /process_data failed: ${await response.text()}`);
      }

      const raw = await response.json();

      const result: SignedEnclaveResponse = {
        response: {
          riskLevel: raw.response.risk_level,
          headline: raw.response.headline,
          plainEnglish: raw.response.headline,
          reasons: raw.response.flags || [],
          recommendedAction: raw.response.risk_level === 'RED' ? 'Do Not Sign' : 'Review carefully',
          timestampMs: raw.response.timestamp_ms,
        },
        signature: Buffer.from(raw.signature, 'hex').toString('base64'),
      };

      // Verify enclave signature before returning
      const valid = await this.verifyEnclaveSignature(
        result.response,
        result.signature,
        raw.response.malicious_package_id,
        raw.response.walrus_blob_id,
      );
      if (!valid) {
        console.error('🚨 Enclave signature verification FAILED');
      }

      return result;
    } catch (error) {
      console.error('🚨 Enclave Simulation Threat Analysis Failed:', error);
      throw error;
    }
  }

  /**
   * Get enclave attestation (PCRs + public key)
   */
  async getAttestation(): Promise<EnclaveAttestation> {
    if (this.useStub) {
      throw new Error('Attestation not available in stub mode');
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/get_attestation`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Enclave /get_attestation failed: ${response.status}`);
      }

      return await response.json() as EnclaveAttestation;
    } catch (error) {
      console.error('🔒 Enclave Connection Error [getAttestation]:', error);
      throw error;
    }
  }

  /**
   * Verify enclave signature on response.
   * 
   * Reconstructs the signing message matching the Rust server's build_signing_message():
   *   package_id(32 bytes) + blob_id(utf8) + timestamp_ms(8 bytes LE)
   * 
   * Then verifies the Ed25519 signature against ENCLAVE_PUBLIC_KEY.
   */
  private async verifyEnclaveSignature(
    response: ThreatAnalysisResult,
    signatureBase64: string,
    maliciousPackageId?: string | null,
    walrusBlobId?: string | null,
  ): Promise<boolean> {
    try {
      if (this.useStub) return true;

      const publicKeyHex = process.env.ENCLAVE_PUBLIC_KEY;
      if (!publicKeyHex) {
        console.warn('ENCLAVE_PUBLIC_KEY not set, skipping signature verification');
        return true;
      }

      // Reconstruct the signing message matching Rust's build_signing_message()
      const pkgHex = (maliciousPackageId || '0000000000000000000000000000000000000000000000000000000000000000')
        .replace(/^0x/, '');
      const pkgBytes = Buffer.from(pkgHex, 'hex');
      const pkgPadded = Buffer.alloc(32, 0);
      pkgBytes.copy(pkgPadded, 0, 0, Math.min(pkgBytes.length, 32));

      const blobStr = walrusBlobId || '';
      const blobBytes = Buffer.from(blobStr, 'utf8');

      const tsLe = Buffer.alloc(8, 0);
      tsLe.writeBigUInt64LE(BigInt(response.timestampMs));

      const message = Buffer.concat([pkgPadded, blobBytes, tsLe]);

      // Verify Ed25519 signature
      const publicKey = Buffer.from(publicKeyHex, 'hex');
      const signature = Buffer.from(signatureBase64, 'base64');

      const valid = ed25519.verify(signature, message, publicKey);

      console.log('🔐 Enclave signature verification:', {
        messageLength: message.length,
        signatureLength: signature.length,
        publicKeyLength: publicKey.length,
        verified: valid,
      });

      return valid;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Stub implementation - calls current Gemini API directly
   * Used when ENCLAVE_URL is not set
   */
  private async processDataStub(payload: ThreatAnalysisPayload): Promise<SignedEnclaveResponse> {
    // Call existing /api/explain endpoint
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionBytes: payload.transactionBytes,
        userIntent: payload.userIntent,
        userAddress: payload.userAddress,
        network: payload.network,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stub API failed: ${response.status}`);
    }

    const data = await response.json();

    // Convert to enclave response format
    const result: ThreatAnalysisResult = {
      riskLevel: data.risk?.riskLevel || 'YELLOW',
      headline: data.explanation?.headline || 'Analysis complete',
      plainEnglish: data.explanation?.plainEnglish || '',
      reasons: data.risk?.reasons || [],
      recommendedAction: data.explanation?.recommendedAction || 'Review carefully',
      timestampMs: Date.now(),
    };

    // Generate mock signature (not verified in stub mode)
    const mockSignature = '0'.repeat(128);

    return {
      response: result,
      signature: mockSignature,
    };
  }
}

// Singleton instance
let enclaveClient: EnclaveClient | null = null;

export function getEnclaveClient(): EnclaveClient {
  if (!enclaveClient) {
    enclaveClient = new EnclaveClient();
  }
  return enclaveClient;
}
