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
      console.log('EnclaveClient: stub mode (no ENCLAVE_URL set)');
    } else {
      console.log(`EnclaveClient: connected to ${this.enclaveUrl}`);
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
          asset_flows: [],
          move_calls: [],
          gas_budget: 10000000,
        },
      },
    };

    const response = await fetch(`${this.enclaveUrl}/process_data`, {
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

    return result;
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

    const response = await this.fetchWithRetry(`${this.enclaveUrl}/process_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enclavePayload),
    });

    if (!response.ok) {
      throw new Error(`Enclave /process_data failed: ${await response.text()}`);
    }

    const raw = await response.json();

    return {
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
