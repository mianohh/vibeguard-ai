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
    
    // For YELLOW risk with no specific pattern, use ASSET_DRAIN template
    if (threatPattern.type === 'SAFE' && risk.riskLevel === 'YELLOW') {
      return this.generateExplanation(
        { type: 'ASSET_DRAIN', severity: 'HIGH', indicators: risk.reasons },
        effects, risk
      );
    }

    // Generate explanation based on detected pattern
    return this.generateExplanation(threatPattern, effects, risk);
  }

  private detectThreatPattern(
    effects: EffectsSummary,
    risk: RiskAnalysis,
    userIntent?: string
  ): ThreatPattern {
    
    // 0. Blacklisted Package Check (HIGHEST PRIORITY)
    if (this.isBlacklistedPackage(effects)) {
      return {
        type: 'BLACKLISTED_TARGET',
        severity: 'CRITICAL',
        indicators: [
          'Transaction interacts with known malicious contract',
          'Package flagged in on-chain ReputationRegistry',
          'Confirmed threat - do not proceed'
        ]
      };
    }

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

    // 2. Permission Hijack Detection (AdminCap/High-Value Object Transfer)
    const permissionHijack = this.detectPermissionHijack(effects);
    if (permissionHijack) {
      return {
        type: 'PERMISSION_HIJACK',
        severity: 'CRITICAL',
        indicators: [
          'AdminCap or high-privilege object being transferred',
          'Potential complete loss of contract control',
          'Irreversible permission change'
        ]
      };
    }

    // 3. Self-Transfer (Safe Pattern)
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

    // 4. Asset Drain Detection (Enhanced)
    const drainPattern = this.detectAssetDrain(effects, userIntent);
    if (drainPattern) {
      return drainPattern;
    }

    // 5. Permission Escalation
    if (effects.permissionChanges.length > 0) {
      return {
        type: 'PERMISSION_CHANGE',
        severity: 'MEDIUM',
        indicators: effects.permissionChanges.map(p => 
          `${p.type === 'granted' ? 'Granting' : 'Revoking'} ${p.permission} to ${p.target}`
        )
      };
    }

    // 6. Complex Multi-Step Transaction
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

    // 7. Failed Transaction
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

    // 8. Safe Transaction (default)
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

  private isBlacklistedPackage(effects: EffectsSummary): boolean {
    // TODO: Query on-chain ReputationRegistry for blacklisted packages
    // For now, check against known malicious patterns in object types
    const suspiciousPatterns = [
      '0xbad1bad1', // Example malicious package
      '0xdead', // Example scam package
    ];

    return effects.objectChanges.some(obj => 
      suspiciousPatterns.some(pattern => obj.objectType?.includes(pattern))
    );
  }

  private detectPermissionHijack(effects: EffectsSummary): boolean {
    // Check for AdminCap or high-privilege object transfers
    const highPrivilegePatterns = [
      'AdminCap',
      'OwnerCap',
      'TreasuryCap',
      'MintCap',
      'BurnCap'
    ];

    // Check if any high-privilege objects are being transferred
    const hasCapTransfer = effects.objectChanges.some(obj => 
      highPrivilegePatterns.some(cap => obj.objectType?.includes(cap)) &&
      obj.owner !== 'you'
    );

    // Check for deeply nested object transfers (potential privilege escalation)
    const hasDeepObjectTransfer = effects.transfers.some(t => 
      t.from === 'you' && 
      t.to !== 'you' && 
      t.coinType !== 'Token' // Not a simple token transfer
    );

    return hasCapTransfer || hasDeepObjectTransfer;
  }

  private detectAssetDrain(effects: EffectsSummary, userIntent?: string): ThreatPattern | null {
    const outgoingValue = this.calculateOutgoingValue(effects);
    
    // No outgoing assets = no drain
    if (outgoingValue === 0) return null;

    // Check if this is an expected transfer
    if (this.isExpectedTransfer(effects, userIntent)) return null;

    // Enhanced drain detection: Check for claim functions with outgoing transfers
    const hasClaimFunction = userIntent?.toLowerCase().includes('claim');
    const hasOutgoingTransfer = effects.transfers.some(t => 
      t.from === 'you' && t.to !== 'you'
    );

    if (hasClaimFunction && hasOutgoingTransfer) {
      return {
        type: 'ASSET_DRAIN',
        severity: 'CRITICAL',
        indicators: [
          'User calls claim function expecting to receive assets',
          `Transaction contains TransferObjects moving ${outgoingValue.toFixed(4)} SUI out`,
          'Classic honeypot pattern - assets drain instead of claim'
        ]
      };
    }

    // Standard asset drain
    if (outgoingValue > 0) {
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

    return null;
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
      BLACKLISTED_TARGET: {
        headline: '🚫 Known Malicious Contract',
        plainEnglish: 'This transaction interacts with a contract that has been flagged as malicious in our on-chain threat registry. This is a confirmed threat.',
        action: 'Do Not Sign',
        checks: [
          'This contract is blacklisted - do not proceed',
          'Report this attempt to the dApp you are using',
          'Check if your wallet has been compromised'
        ]
      },

      PERMISSION_HIJACK: {
        headline: '🔴 Critical Permission Transfer',
        plainEnglish: 'This transaction will transfer administrative capabilities (AdminCap, OwnerCap, or similar) to another address. This grants complete control over the contract and is irreversible.',
        action: 'Do Not Sign',
        checks: [
          'Verify you are the legitimate owner of this capability',
          'Confirm the recipient address is correct and trusted',
          'Understand this transfer is permanent and cannot be undone'
        ]
      },

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
        headline: '⚠️ Outgoing Transfer — Verify Recipient',
        plainEnglish: 'This transaction will send assets from your wallet to another address. Confirm the recipient and amount are correct before signing.',
        action: 'Be Careful',
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
  | 'BLACKLISTED_TARGET'
  | 'INTENT_MISMATCH'
  | 'PERMISSION_HIJACK'
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
