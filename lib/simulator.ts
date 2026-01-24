import { SuiClient } from '@mysten/sui.js/client';
import { SuiNetwork, SimulationResult, EffectsSummary } from '@/types';

export class SuiSimulator {
  private clients: Map<SuiNetwork, SuiClient> = new Map();

  constructor() {
    this.clients.set('mainnet', new SuiClient({ 
      url: process.env.SUI_RPC_MAINNET || 'https://fullnode.mainnet.sui.io:443' 
    }));
    this.clients.set('testnet', new SuiClient({ 
      url: process.env.SUI_RPC_TESTNET || 'https://fullnode.testnet.sui.io:443' 
    }));
    this.clients.set('devnet', new SuiClient({ 
      url: process.env.SUI_RPC_DEVNET || 'https://fullnode.devnet.sui.io:443' 
    }));
  }

  async simulate(transactionBytes: string, network: SuiNetwork, userAddress?: string): Promise<SimulationResult> {
    const client = this.clients.get(network);
    if (!client) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Simulation timeout after 8 seconds')), 8000);
    });

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const simulationPromise = client.dryRunTransactionBlock({
          transactionBlock: transactionBytes,
          options: {
            showEffects: true,
            showBalanceChanges: true,
            showObjectChanges: true,
            showEvents: false,
            showInput: false,
          },
        });

        const rawDryRun = await Promise.race([simulationPromise, timeoutPromise]);
        const effectsSummary = this.normalizeEffects(rawDryRun, userAddress);

        return {
          rawDryRun,
          effectsSummary
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Simulation attempt ${attempt + 1} failed:`, error.message);
        
        // Only retry on network errors
        if (this.isNetworkError(error) && attempt < 2) {
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        
        // For non-network errors, throw immediately with more context
        if (error.message?.includes('Invalid transaction')) {
          throw new Error('Invalid transaction format - ensure you copied the complete base64 transaction from your wallet');
        }
        
        throw new Error(`Simulation failed: ${error.message || 'Unknown error'}`);
      }
    }

    throw lastError || new Error('Simulation failed after retries');
  }

  private normalizeEffects(dryRun: any, userAddress?: string): EffectsSummary {
    if (!dryRun) {
      return {
        success: false,
        gasUsed: 0,
        balanceChanges: [],
        transfers: [],
        objectChanges: [],
        permissionChanges: [],
        uncertain: ['Could not parse transaction effects']
      };
    }

    const effects = dryRun.effects;
    const balanceChanges: any[] = [];
    const transfers: any[] = [];
    const objectChanges: any[] = [];
    const permissionChanges: any[] = [];
    const uncertain: string[] = [];

    try {
      // Extract balance changes from top-level field
      const rawBalanceChanges = dryRun.balanceChanges || [];
      
      for (const change of rawBalanceChanges) {
        const normalizedChange = {
          type: parseInt(change.amount) > 0 ? 'increase' : 'decrease',
          amount: Math.abs(parseInt(change.amount)).toString(),
          coinType: this.normalizeCoinType(change.coinType),
          owner: this.normalizeAddress(change.owner, userAddress)
        };
        balanceChanges.push(normalizedChange);
      }

      // Create transfers by analyzing balance changes
      // Group by coinType to find transfer pairs
      const coinTypes = [...new Set(rawBalanceChanges.map(c => c.coinType))];
      
      for (const coinType of coinTypes) {
        const changesForCoin = rawBalanceChanges.filter(c => c.coinType === coinType);
        
        // Find decreases (outgoing) and increases (incoming)
        const decreases = changesForCoin.filter(c => parseInt(c.amount) < 0);
        const increases = changesForCoin.filter(c => parseInt(c.amount) > 0);
        
        // Create transfers for each decrease
        for (const decrease of decreases) {
          const fromOwner = this.normalizeAddress(decrease.owner, userAddress);
          
          // Find corresponding increase (if any)
          const correspondingIncrease = increases.find(inc => 
            Math.abs(parseInt(inc.amount)) === Math.abs(parseInt(decrease.amount))
          );
          
          const toOwner = correspondingIncrease 
            ? this.normalizeAddress(correspondingIncrease.owner, userAddress)
            : 'another_address';
          
          transfers.push({
            from: fromOwner,
            to: toOwner,
            amount: Math.abs(parseInt(decrease.amount)).toString(),
            coinType: this.normalizeCoinType(coinType)
          });
        }
      }

      // Extract object changes
      const rawObjectChanges = dryRun.objectChanges || [];
      for (const obj of rawObjectChanges) {
        objectChanges.push({
          type: obj.type === 'created' ? 'created' : obj.type === 'mutated' ? 'mutated' : 'deleted',
          objectType: this.normalizeObjectType(obj.objectType),
          owner: this.normalizeAddress(obj.owner, userAddress)
        });
      }

      // Mark as uncertain if no balance changes found
      if (rawBalanceChanges.length === 0) {
        uncertain.push('No balance changes detected - may indicate incomplete simulation data');
      }

      // Mark as uncertain if no user address provided
      if (!userAddress) {
        uncertain.push('User address not provided - risk analysis may be incomplete');
      }

    } catch (error) {
      uncertain.push('Could not fully parse transaction effects');
    }

    return {
      success: effects?.status?.status === 'success',
      gasUsed: parseInt(effects?.gasUsed?.computationCost || '0'),
      balanceChanges,
      transfers,
      objectChanges,
      permissionChanges,
      uncertain
    };
  }

  private normalizeAddress(address: any, userAddress?: string): 'you' | 'another_address' | 'smart_contract' {
    if (!address) return 'another_address';
    
    if (typeof address === 'object') {
      if (address.AddressOwner) {
        return userAddress && address.AddressOwner === userAddress ? 'you' : 'another_address';
      }
      if (address.ObjectOwner) return 'smart_contract';
      if (address.Shared) return 'smart_contract';
      if (address.Immutable) return 'smart_contract';
    }
    
    return 'another_address';
  }

  private normalizeCoinType(coinType: string): string {
    if (!coinType) return 'Unknown token';
    if (coinType.includes('sui::sui::SUI')) return 'SUI';
    return 'Token';
  }

  private normalizeObjectType(objectType: string): string {
    if (!objectType) return 'Unknown object';
    const parts = objectType.split('::');
    return parts[parts.length - 1] || 'Unknown object';
  }

  private isNetworkError(error: any): boolean {
    const networkErrorMessages = [
      'network',
      'timeout',
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}