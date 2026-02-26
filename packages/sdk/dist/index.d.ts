type Network = 'mainnet' | 'testnet' | 'devnet';
type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
interface AnalysisOptions {
    transactionBytes: string;
    network: Network;
    userAddress?: string;
    userIntent?: string;
}
interface AnalysisResult {
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
interface VibeGuardConfig {
    apiKey?: string;
    baseUrl?: string;
}
declare class VibeGuard {
    private apiKey?;
    private baseUrl;
    constructor(config?: VibeGuardConfig);
    analyzeTransaction(options: AnalysisOptions): Promise<AnalysisResult>;
}

export { type AnalysisOptions, type AnalysisResult, type Network, type RiskLevel, VibeGuard, type VibeGuardConfig };
