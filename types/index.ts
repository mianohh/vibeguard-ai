export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface SimulationResult {
  rawDryRun: any;
  effectsSummary: EffectsSummary;
}

export interface EffectsSummary {
  success: boolean;
  gasUsed: number;
  balanceChanges: BalanceChange[];
  transfers: Transfer[];
  objectChanges: ObjectChange[];
  permissionChanges: PermissionChange[];
  uncertain: string[];
}

export interface BalanceChange {
  type: 'increase' | 'decrease';
  amount: string;
  coinType: string;
  owner: 'you' | 'another_address' | 'smart_contract';
}

export interface Transfer {
  from: 'you' | 'another_address' | 'smart_contract';
  to: 'you' | 'another_address' | 'smart_contract';
  amount: string;
  coinType: string;
}

export interface ObjectChange {
  type: 'created' | 'mutated' | 'deleted';
  objectType: string;
  owner: 'you' | 'another_address' | 'smart_contract' | 'shared' | 'immutable';
}

export interface PermissionChange {
  type: 'granted' | 'revoked';
  permission: string;
  target: 'you' | 'another_address' | 'smart_contract';
}

export interface RiskAnalysis {
  riskLevel: RiskLevel;
  reasons: string[];
  confidence: number;
}

export interface GeminiExplanation {
  headline: string;
  plainEnglish: string;
  bulletPoints: string[];
  recommendedAction: 'Sign' | 'Be Careful' | 'Do Not Sign';
  whatToCheck: string[];
}

export interface AnalysisResult {
  simulation: SimulationResult;
  risk: RiskAnalysis;
  explanation: GeminiExplanation;
}

export interface ApiError {
  error: string;
  details?: string;
}