# vibeguard-sui-security

TypeScript SDK for [VibeGuard AI](https://vibeguardai.vercel.app) — real-time transaction security and decentralized threat intelligence for the Sui ecosystem.

Analyze unsigned transaction bytes before a user signs. Detects honeypots, intent mismatches, and known malicious contracts. Threats are automatically registered on-chain via the VibeGuard `ReputationRegistry`.

**No API key required.**

## Installation

```bash
npm install vibeguard-sui-security
```

## Usage

### Analyze a Transaction

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...', // Raw Base64 from wallet provider (before signing)
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop',
  onThreatDetected: (result) => {
    // Fires on RED results — threat is auto-reported on-chain by VibeGuard
    console.error('🚨 HONEYPOT DETECTED:', result.explanation.headline);
  }
});

if (result.risk.riskLevel === 'RED') {
  // Block the transaction
}
```

### Risk Levels

| Level | Meaning |
|---|---|
| `GREEN` | Transaction appears safe |
| `YELLOW` | Proceed with caution |
| `RED` | High risk — block and warn user |

### Retrieve a Threat Report

Resolve a `ThreatReported` event's `blobId` to the full AI report stored on Walrus decentralized storage:

```typescript
const report = await guard.retrieveThreatReport(
  'oNyrr0jEVATWSAGkJHnmoKVICnFosv1k4YNayZXcRgk', // blobId from ThreatReported event
  '0x08108c7412210ef9816aea2de0899f2dcad6f521631f314ab1fa29bf353af9a4' // blobObjectId (optional — enables liveness check)
);

console.log(report.riskLevel);    // 'RED'
console.log(report.reasons);      // ['Intent mismatch detected', ...]
console.log(report.plainEnglish); // Full AI explanation
```

Passing `blobObjectId` enables a liveness gate — if the Walrus Blob NFT no longer exists on Sui, the call throws with a `410 Gone` error.

## API Reference

### `new VibeGuard(config?)`

| Option | Type | Default |
|---|---|---|
| `baseUrl` | `string` | `https://vibeguardai.vercel.app` |

### `analyzeTransaction(options): Promise<AnalysisResult>`

| Option | Type | Required |
|---|---|---|
| `transactionBytes` | `string` | ✅ Base64 transaction bytes |
| `network` | `'mainnet' \| 'testnet' \| 'devnet'` | ✅ |
| `userAddress` | `string` | Recommended |
| `userIntent` | `string` | Recommended (e.g. `'Claim airdrop'`) |
| `onThreatDetected` | `(result: AnalysisResult) => void` | Optional callback on RED |

### `retrieveThreatReport(blobId, blobObjectId?): Promise<ThreatReport>`

| Param | Type | Description |
|---|---|---|
| `blobId` | `string` | Walrus blob ID from `ThreatReported` event |
| `blobObjectId` | `string` | Optional Sui Blob NFT object ID — enables liveness gate |

## REST API

The underlying REST API is also fully open:

```bash
# Analyze a transaction
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBytes": "AAACAA...",
    "network": "mainnet",
    "userAddress": "0x...",
    "userIntent": "Claim airdrop"
  }'

# Retrieve a threat report from Walrus
curl "https://vibeguardai.vercel.app/api/threat/<blobId>?blobObjectId=<blobObjectId>"
```

Full API docs: [vibeguardai.vercel.app/api-docs](https://vibeguardai.vercel.app/api-docs)

## On-Chain Threat Registry

Every `RED` detection automatically registers the malicious package on the VibeGuard `ReputationRegistry` Move contract on Sui Testnet, emitting a `ThreatReported` event with a Walrus blob reference. Wallet providers and dApps can subscribe to this event feed as a real-time security signal.

- [ReputationRegistry on Sui Testnet](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be)
- [Live Platform](https://vibeguardai.vercel.app)
- [Threat Intelligence Portal](https://vibeguardai.vercel.app/report)

## License

MIT
