# vibeguard-sui-security

TypeScript SDK for VibeGuard AI - Analyze Sui transactions before signing to protect against scams and honeypots.

## Installation

```bash
npm install vibeguard-sui-security
```

## Quick Start

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...', // Base64 transaction bytes
  network: 'testnet',
  userAddress: '0x1234...', // Optional but recommended
  userIntent: 'Claim airdrop' // Optional but recommended for scam detection
});

console.log(result.risk.riskLevel); // 'GREEN' | 'YELLOW' | 'RED'
console.log(result.explanation.recommendedAction);
```

## With API Key (Production)

```typescript
const guard = new VibeGuard({
  apiKey: 'your-api-key'
});
```

## Response Structure

```typescript
{
  risk: {
    riskLevel: 'RED',
    reasons: ['⚠️ INTENT MISMATCH: Assets leaving wallet'],
    confidence: 0.9
  },
  explanation: {
    headline: 'Honeypot Scam Detected',
    plainEnglish: 'This transaction will send 100 SUI...',
    recommendedAction: 'Do Not Sign'
  },
  simulation: {
    effectsSummary: {...},
    staticAnalysis: {...}
  }
}
```

## Features

- 🚫 Blacklist protection against known malicious contracts
- 🎯 Intent mismatch detection for honeypot scams
- 🤖 AI-powered risk explanations
- 🔍 Static analysis without RPC calls
- 🌐 Multi-network support (mainnet, testnet, devnet)

## License

MIT
