export type Network = 'mainnet' | 'testnet' | 'devnet';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface ThreatReport {
  packageId: string;
  riskLevel: string;
  reasons: string[];
  headline: string;
  plainEnglish: string;
  recommendedAction: string;
  reportedAt: string;
  reportedBy: string;
}

export interface AnalysisOptions {
  transactionBytes: string;
  network: Network;
  userAddress?: string;
  userIntent?: string;
  onThreatDetected?: (result: AnalysisResult) => void;
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
    const { onThreatDetected, ...payload } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/api/explain`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as AnalysisResult;

    // RED results are auto-reported on-chain by the VibeGuard backend pipeline.
    // Fire the optional callback so wallet providers can react immediately.
    if (result.risk?.riskLevel === 'RED' && onThreatDetected) {
      onThreatDetected(result);
    }

    return result;
  }

  async retrieveThreatReport(blobId: string, blobObjectId?: string): Promise<ThreatReport> {
    const url = new URL(`${this.baseUrl}/api/threat/${blobId}`);
    if (blobObjectId) url.searchParams.set('blobObjectId', blobObjectId);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ThreatReport>;
  }

  async queryThreats(options: {
    category?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.category) params.set('category', options.category);
    if (options.severity) params.set('severity', options.severity);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const response = await fetch(`${this.baseUrl}/api/threats?${params}`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async getThreatStats() {
    const response = await fetch(`${this.baseUrl}/api/threats?stats=true`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  subscribeToThreats(callback: (event: any) => void) {
    const eventSource = new EventSource(`${this.baseUrl}/api/events`);
    eventSource.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };
    return () => eventSource.close();
  }

  async registerWebhook(url: string, events: string[], apiKey: string) {
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, events, apiKey }),
    });
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async getWebhooks() {
    const response = await fetch(`${this.baseUrl}/api/webhooks`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async reindexThreats() {
    const response = await fetch(`${this.baseUrl}/api/indexer`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async getIndexerStats() {
    const response = await fetch(`${this.baseUrl}/api/indexer`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async getAnalytics() {
    const response = await fetch(`${this.baseUrl}/api/analytics`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }

  async getBlobHealth() {
    const response = await fetch(`${this.baseUrl}/api/blob-health`);
    if (!response.ok) {
      throw new Error(`VibeGuard API error: ${response.status}`);
    }
    return response.json();
  }
}
