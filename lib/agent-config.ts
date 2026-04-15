/**
 * LocalThreatAgent Configuration
 * 
 * This file contains the proprietary threat-scoring weights and heuristic rules
 * that power VibeGuard's sovereign threat detection engine.
 * 
 * In production, this configuration is encrypted under a Seal PCR-based policy
 * and can only be decrypted inside the approved Nautilus enclave.
 */

export interface ThreatAgentConfig {
  version: string;
  
  // Threat pattern scoring weights
  weights: {
    intentMismatch: number;        // Weight for intent vs reality mismatch
    assetDrain: number;            // Weight for unexpected outgoing transfers
    permissionChange: number;      // Weight for capability grants
    complexTransaction: number;    // Weight for multi-step operations
    failedExecution: number;       // Weight for transactions that will fail
  };
  
  // Thresholds for risk classification
  thresholds: {
    redRisk: number;               // Score above this = RED
    yellowRisk: number;            // Score above this = YELLOW
    greenRisk: number;             // Score below this = GREEN
  };
  
  // Heuristic rules
  rules: {
    minOutgoingValueForDrain: number;     // Minimum SUI to flag as drain (in SUI)
    maxObjectChangesForSimple: number;    // Max changes before "complex"
    intentKeywords: {
      receive: string[];                   // Keywords indicating user expects to receive
      send: string[];                      // Keywords indicating user expects to send
    };
  };
  
  // Pattern signatures (proprietary threat fingerprints)
  signatures: {
    knownHoneypotPatterns: string[];
    knownPhishingPatterns: string[];
  };
}

export const DEFAULT_AGENT_CONFIG: ThreatAgentConfig = {
  version: '1.0.0',
  
  weights: {
    intentMismatch: 10.0,      // Highest weight - critical indicator
    assetDrain: 8.0,           // High weight - direct financial risk
    permissionChange: 5.0,     // Medium weight - future risk
    complexTransaction: 3.0,   // Lower weight - requires review
    failedExecution: 2.0,      // Lowest weight - wastes gas only
  },
  
  thresholds: {
    redRisk: 8.0,
    yellowRisk: 4.0,
    greenRisk: 2.0,
  },
  
  rules: {
    minOutgoingValueForDrain: 0.1,  // 0.1 SUI minimum to flag
    maxObjectChangesForSimple: 5,
    intentKeywords: {
      receive: ['claim', 'receive', 'get', 'airdrop', 'mint', 'collect', 'earn', 'reward'],
      send: ['send', 'transfer', 'pay', 'swap', 'trade', 'sell', 'stake'],
    },
  },
  
  signatures: [
    // Proprietary threat fingerprints would go here
    // These are pattern hashes derived from known attacks
  ],
};

/**
 * Load agent configuration from Seal-encrypted storage
 * In production, this would decrypt the config from the enclave
 */
export function loadAgentConfig(): ThreatAgentConfig {
  // In production with Seal:
  // 1. Enclave boots and generates attestation
  // 2. Seal key servers verify PCR measurements
  // 3. Key shares returned only if PCRs match policy
  // 4. Enclave decrypts configuration
  // 5. Configuration loaded into LocalThreatAgent
  
  // For now, return default config
  return DEFAULT_AGENT_CONFIG;
}
