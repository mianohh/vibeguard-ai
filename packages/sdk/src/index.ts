export type Network = 'mainnet' | 'testnet' | 'devnet';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface AnalysisOptions {
  transactionBytes: string;
  network: Network;
  userAddress?: string;
  userIntent?: string;
}

export interface AnalysisResult {
  simulation: {
    effectsSummary: any;
    staticAnalysis: {
      moveCalls: Array<{
        packageId: string;
        moduleName: string;
        functionName: string;
      }>;
      gasBudget: string;
      isHighGas: boolean;
      containsDirectTransfer: boolean;
      chainId: string;
      networkMismatch: boolean;
    };
  };
  risk: {
    riskLevel: RiskLevel;
    reasons: string[];
    confidence: number;
  };
  explanation: {
    headline: string;
    plainEnglish: string;
    recommendedAction: string;
  };
}

export interface VibeGuardConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class VibeGuard {
  private apiKey?: string;
  private baseUrl: string;

  constructor(config: VibeGuardConfig = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://vibeguardai.vercel.app';
  }

  async analyzeTransaction(options: AnalysisOptions): Promise<AnalysisResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/api/explain`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<AnalysisResult>;
  }
}
