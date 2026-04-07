/**
 * Enclave Client Wrapper
 * 
 * Provides a clean interface for calling the Nautilus enclave endpoints.
 * Automatically switches between local stub and real enclave based on env var.
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export interface ThreatAnalysisPayload {
  transactionBytes: string;
  userIntent: string;
  userAddress?: string;
  network?: string;
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

export interface AttestationResponse {
  publicKey: string;
  pcr0: string;
  pcr1: string;
  pcr2: string;
  attestationDocument?: string;
}

export class EnclaveClient {
  private enclaveUrl: string;
  private useStub: boolean;

  constructor() {
    // Use real enclave if ENCLAVE_URL is set, otherwise use stub (current Gemini API)
    this.enclaveUrl = process.env.ENCLAVE_URL || process.env.NEXT_PUBLIC_ENCLAVE_URL || '';
    this.useStub = !this.enclaveUrl;

    if (this.useStub) {
      console.log('⚠️  EnclaveClient: Using stub mode (direct Gemini API)');
    } else {
      console.log(`✅ EnclaveClient: Connected to enclave at ${this.enclaveUrl}`);
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

    const response = await fetch(`${this.enclaveUrl}/process_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Enclave /process_data failed: ${error}`);
    }

    const result: SignedEnclaveResponse = await response.json();

    // Verify enclave signature before accepting
    const isValid = await this.verifyEnclaveSignature(result.response, result.signature);
    if (!isValid) {
      throw new Error('Invalid enclave signature - response rejected');
    }

    return result;
  }

  /**
   * Get enclave attestation (PCRs + public key)
   */
  async getAttestation(): Promise<AttestationResponse> {
    if (this.useStub) {
      throw new Error('Attestation not available in stub mode');
    }

    const response = await fetch(`${this.enclaveUrl}/get_attestation`);

    if (!response.ok) {
      throw new Error(`Enclave /get_attestation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Verify enclave signature on response
   * 
   * In production, this fetches the enclave's public key from on-chain EnclaveConfig
   * and verifies the Ed25519 signature.
   */
  private async verifyEnclaveSignature(
    response: ThreatAnalysisResult,
    signatureHex: string
  ): Promise<boolean> {
    try {
      // TODO: Fetch enclave public key from on-chain EnclaveConfig
      // For now, skip verification in stub mode
      if (this.useStub) return true;

      // Reconstruct message (JSON serialization of response)
      const message = Buffer.from(JSON.stringify(response));
      const signature = Buffer.from(signatureHex, 'hex');

      // TODO: Verify using enclave's registered public key
      // const publicKey = await this.getEnclavePublicKey();
      // return ed25519.verify(signature, publicKey, message);

      // For now, accept all signatures (will be implemented with real enclave)
      return true;
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
