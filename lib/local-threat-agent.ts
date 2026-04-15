import { EffectsSummary, RiskAnalysis, GeminiExplanation } from '@/types';
import { loadAgentConfig, ThreatAgentConfig } from './agent-config';

/**
 * LocalThreatAgent - Sovereign threat analysis with Seal-protected configuration
 * 
 * The agent's proprietary scoring weights and heuristic rules are encrypted
 * under a Seal PCR-based policy, ensuring they can only be accessed inside
 * the approved Nautilus enclave execution environment.
 * 
 * Phase 1: Pure TypeScript logic with default config
 * Phase 2: Load Seal-encrypted config in enclave
 * Phase 3: Add lightweight local LLM (Llama 3.2 1B via llama.cpp)
 */
export class LocalThreatAgent {
  private config: ThreatAgentConfig;
  
  constructor() {
    // In production: this loads Seal-encrypted config from enclave
    this.config = loadAgentConfig();
  }
  
  async analyze(
    effects: EffectsSummary,
    risk: RiskAnalysis,
    userIntent?: string
  ): Promise<GeminiExplanation> {
    
    // Pattern matching for common threat scenarios
    const threatPattern = this.detectThreatPattern(effects, risk, userIntent);
    
    // Generate explanation based on detected pattern
    return this.generateExplanation(threatPattern, effects, risk);
  }

  private detectThreatPattern(
    effects: EffectsSummary,
    risk: RiskAnalysis,
    userIntent?: string
  ): ThreatPattern {
    
    // 1. Intent Mismatch Detection (Honeypot/Phishing)
    if (userIntent && this.hasIntentMismatch(effects, userIntent)) {
      return {
        type: 'INTENT_MISMATCH',
        severity: 'CRITICAL',
        indicators: [
          'User expects to receive assets',
          'Transaction actually sends assets away',
          'Classic honeypot/airdrop scam pattern'
        ]
      };
    }

    // 2. Self-Transfer (Safe Pattern)
    if (this.isSelfTransfer(effects)) {
      return {
        type: 'SAFE',
        severity: 'NONE',
        indicators: [
          'Self-transfer detected - assets remain in your control',
          'No assets leaving your wallet to other addresses',
          'No permission changes',
          'Simple transaction with minimal state changes'
        ]
      };
    }

    // 3. Unexpected Asset Drain
    const outgoingValue = this.calculateOutgoingValue(effects);
    if (outgoingValue > 0 && !this.isExpectedTransfer(effects, userIntent)) {
      return {
        type: 'ASSET_DRAIN',
        severity: 'HIGH',
        indicators: [
          `${outgoingValue.toFixed(4)} SUI leaving your wallet`,
          'No corresponding incoming assets',
          'Potential unauthorized transfer'
        ]
      };
    }

    // 4. Permission Escalation
    if (effects.permissionChanges.length > 0) {
      return {
        type: 'PERMISSION_CHANGE',
        severity: 'MEDIUM',
        indicators: effects.permissionChanges.map(p => 
          `Granting ${p.permission} to ${p.grantedTo}`
        )
      };
    }

    // 5. Complex Multi-Step Transaction
    if (effects.objectChanges.length > 5 || effects.uncertain.length > 0) {
      return {
        type: 'COMPLEX_TRANSACTION',
        severity: 'MEDIUM',
        indicators: [
          `${effects.objectChanges.length} object changes`,
          'Complex state mutations',
          'Requires careful review'
        ]
      };
    }

    // 6. Failed Transaction
    if (!effects.success) {
      return {
        type: 'FAILED_EXECUTION',
        severity: 'LOW',
        indicators: [
          'Transaction will fail if executed',
          'Likely insufficient balance or invalid state'
        ]
      };
    }

    // 7. Safe Transaction (default)
    return {
      type: 'SAFE',
      severity: 'NONE',
      indicators: [
        'No suspicious patterns detected',
        'Standard transaction flow',
        'Assets remain under your control'
      ]
    };
  }

  private isSelfTransfer(effects: EffectsSummary): boolean {
    // Check if all transfers are to self or no external transfers
    const hasExternalTransfer = effects.transfers.some(t => 
      t.from === 'you' && t.to !== 'you' && t.to !== 'another_address'
    );
    
    // Check if all created/mutated objects stay with user
    const allObjectsStayWithUser = effects.objectChanges.every(obj => 
      obj.owner === 'you'
    );
    
    return !hasExternalTransfer && allObjectsStayWithUser;
  }

  private hasIntentMismatch(effects: EffectsSummary, userIntent: string): boolean {
    const intentLower = userIntent.toLowerCase();
    
    // User expects to RECEIVE
    const expectsReceive = [
      'claim', 'receive', 'get', 'airdrop', 'mint', 'collect', 'earn'
    ].some(keyword => intentLower.includes(keyword));

    // But transaction SENDS assets away
    const sendsAssets = effects.transfers.some(t => 
      t.from === 'you' && t.to !== 'you'
    );

    return expectsReceive && sendsAssets;
  }

  private calculateOutgoingValue(effects: EffectsSummary): number {
    return effects.balanceChanges
      .filter(c => c.type === 'decrease' && c.owner === 'you')
      .reduce((sum, c) => sum + (parseInt(c.amount) / 1_000_000_000), 0);
  }

  private isExpectedTransfer(effects: EffectsSummary, userIntent?: string): boolean {
    if (!userIntent) return false;
    
    const intentLower = userIntent.toLowerCase();
    const transferKeywords = ['send', 'transfer', 'pay', 'swap', 'trade'];
    
    return transferKeywords.some(keyword => intentLower.includes(keyword));
  }

  private generateExplanation(
    pattern: ThreatPattern,
    effects: EffectsSummary,
    risk: RiskAnalysis
  ): GeminiExplanation {
    
    const templates: Record<ThreatPatternType, ExplanationTemplate> = {
      INTENT_MISMATCH: {
        headline: '🚨 Honeypot Attack Detected',
        plainEnglish: 'This transaction is designed to trick you. You expect to receive tokens, but it will actually send your assets to an unknown address. This is a classic airdrop scam.',
        action: 'Do Not Sign',
        checks: [
          'Verify the source of this "airdrop" claim',
          'Check if the project has an official announcement',
          'Never sign transactions that send assets when you expect to receive'
        ]
      },
      
      ASSET_DRAIN: {
        headline: '⚠️ Unexpected Asset Transfer',
        plainEnglish: 'This transaction will send assets from your wallet to another address. If you did not initiate a transfer or payment, this could be unauthorized.',
        action: 'Do Not Sign',
        checks: [
          'Confirm you intended to send these assets',
          'Verify the recipient address is correct',
          'Check the amount matches your expectations'
        ]
      },
      
      PERMISSION_CHANGE: {
        headline: '🔐 Permission Change Required',
        plainEnglish: 'This transaction will grant new permissions to a smart contract. This allows the contract to interact with your assets in the future.',
        action: 'Be Careful',
        checks: [
          'Verify the contract is from a trusted project',
          'Understand what permissions are being granted',
          'Consider if this level of access is necessary'
        ]
      },
      
      COMPLEX_TRANSACTION: {
        headline: '🔍 Complex Transaction',
        plainEnglish: 'This transaction involves multiple steps and state changes. While not necessarily dangerous, it requires careful review to understand all effects.',
        action: 'Be Careful',
        checks: [
          'Review all asset movements carefully',
          'Verify the transaction is from a trusted source',
          'Ensure you understand what will happen'
        ]
      },
      
      FAILED_EXECUTION: {
        headline: '❌ Transaction Will Fail',
        plainEnglish: 'This transaction cannot be executed successfully. It will fail and only consume gas fees.',
        action: 'Do Not Sign',
        checks: [
          'Check if you have sufficient balance',
          'Verify all required conditions are met',
          'Contact the dApp support if this is unexpected'
        ]
      },
      
      SAFE: {
        headline: '✅ Transaction Appears Safe',
        plainEnglish: 'This transaction follows standard patterns with no obvious risks. It appears to be a legitimate operation.',
        action: 'Sign',
        checks: [
          'Verify the transaction is from a trusted source',
          'Confirm you intended to perform this action',
          'Check that any asset amounts match your expectations'
        ]
      }
    };

    const template = templates[pattern.type];
    
    return {
      headline: template.headline,
      plainEnglish: template.plainEnglish,
      bulletPoints: [
        ...pattern.indicators,
        ...risk.reasons
      ],
      recommendedAction: template.action,
      whatToCheck: template.checks
    };
  }
}

// Type definitions
interface ThreatPattern {
  type: ThreatPatternType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  indicators: string[];
}

type ThreatPatternType = 
  | 'INTENT_MISMATCH'
  | 'ASSET_DRAIN'
  | 'PERMISSION_CHANGE'
  | 'COMPLEX_TRANSACTION'
  | 'FAILED_EXECUTION'
  | 'SAFE';

interface ExplanationTemplate {
  headline: string;
  plainEnglish: string;
  action: 'Sign' | 'Be Careful' | 'Do Not Sign';
  checks: string[];
}
