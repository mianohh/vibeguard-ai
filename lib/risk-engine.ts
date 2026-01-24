import { EffectsSummary, RiskAnalysis, RiskLevel } from '@/types';

export class RiskEngine {
  analyze(effects: EffectsSummary): RiskAnalysis {
    const reasons: string[] = [];
    let riskLevel: RiskLevel = 'GREEN';
    let confidence = 1.0;

    // RED conditions (highest priority)
    const redFlags = this.checkRedFlags(effects);
    if (redFlags.length > 0) {
      reasons.push(...redFlags);
      riskLevel = 'RED';
      confidence = 0.9;
    }

    // YELLOW conditions (if not already RED)
    if (riskLevel !== 'RED') {
      const yellowFlags = this.checkYellowFlags(effects);
      if (yellowFlags.length > 0) {
        reasons.push(...yellowFlags);
        riskLevel = 'YELLOW';
        confidence = 0.8;
      }
    }

    // GREEN conditions (if no other flags)
    if (riskLevel === 'GREEN') {
      const greenReasons = this.checkGreenReasons(effects);
      reasons.push(...greenReasons);
      confidence = 0.95;
    }

    // Only reduce confidence for uncertain elements, don't auto-downgrade to YELLOW
    if (effects.uncertain.length > 0) {
      confidence = Math.max(0.7, confidence - (effects.uncertain.length * 0.05));
    }

    return {
      riskLevel,
      reasons,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  private checkRedFlags(effects: EffectsSummary): string[] {
    const flags: string[] = [];

    // Direct analysis of balance changes for outflows to others
    const userOutgoing = effects.balanceChanges.filter(
      change => change.type === 'decrease' && change.owner === 'you'
    );
    
    const othersIncoming = effects.balanceChanges.filter(
      change => change.type === 'increase' && change.owner === 'another_address'
    );

    // RED FLAG: User loses assets AND someone else gains assets (transfer to others)
    if (userOutgoing.length > 0 && othersIncoming.length > 0) {
      // Check if amounts suggest a transfer (not just gas)
      const significantOutgoing = userOutgoing.some(change => {
        const amount = parseInt(change.amount);
        return amount > 1000000; // > 0.001 SUI
      });
      
      if (significantOutgoing) {
        flags.push('Assets leave your wallet to another address');
      }
    }

    // Transaction failure
    if (!effects.success) {
      flags.push('Transaction will fail if executed');
    }

    return flags;
  }

  private checkYellowFlags(effects: EffectsSummary): string[] {
    const flags: string[] = [];

    // Complex state changes
    if (effects.objectChanges.length > 3) {
      flags.push('Complex transaction affecting multiple objects');
    }

    // Interaction with unknown contracts
    const contractInteractions = effects.objectChanges.filter(
      change => change.owner === 'smart_contract'
    );
    
    if (contractInteractions.length > 0) {
      flags.push('Interacting with smart contracts');
    }

    // High gas usage
    if (effects.gasUsed > 10000000) { // 10M gas units
      flags.push('High gas usage transaction');
    }

    // Object deletions
    const deletions = effects.objectChanges.filter(change => change.type === 'deleted');
    if (deletions.length > 0) {
      flags.push('Transaction will delete objects');
    }

    // Permission changes
    if (effects.permissionChanges.length > 0) {
      flags.push('Transaction involves permission changes');
    }

    return flags;
  }

  private checkGreenReasons(effects: EffectsSummary): string[] {
    const reasons: string[] = [];

    const userOutgoing = effects.balanceChanges.filter(
      change => change.type === 'decrease' && change.owner === 'you'
    );
    
    const userIncoming = effects.balanceChanges.filter(
      change => change.type === 'increase' && change.owner === 'you'
    );
    
    const othersIncoming = effects.balanceChanges.filter(
      change => change.type === 'increase' && change.owner === 'another_address'
    );

    // Self-transfer pattern: user has outgoing but no others gain assets
    if (userOutgoing.length > 0 && othersIncoming.length === 0) {
      reasons.push('Self-transfer detected - assets remain in your control');
    }

    // No assets to others
    if (othersIncoming.length === 0) {
      reasons.push('No assets leaving your wallet to other addresses');
    }

    // No permission escalation
    if (effects.permissionChanges.length === 0) {
      reasons.push('No permission changes');
    }

    // Low complexity
    if (effects.objectChanges.length <= 2) {
      reasons.push('Simple transaction with minimal state changes');
    }

    return reasons;
  }
}