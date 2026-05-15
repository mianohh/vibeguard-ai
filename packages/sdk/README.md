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

### Query Threat Intelligence

```typescript
// Get all indexed threats
const { threats } = await guard.queryThreats();

// Filter by category and severity
const honeypots = await guard.queryThreats({
  category: 'Honeypot',
  severity: 'Critical',
  limit: 10,
});

// Get aggregated stats
const { stats } = await guard.getThreatStats();
console.log(stats.total);       // 5
console.log(stats.byCategory);  // { 'Intent Mismatch': 1, 'Unknown': 4 }
console.log(stats.bySeverity);  // { 'High': 1, 'Unknown': 4 }
```

### Subscribe to Real-Time Threats (SSE)

```typescript
// Returns unsubscribe function
const unsubscribe = guard.subscribeToThreats((threat) => {
  console.log('🚨 New threat:', threat.malicious_package_id);
  blacklist.add(threat.malicious_package_id);
});

// Stop listening
unsubscribe();
```

### Retrieve a Threat Report

Resolve a `ThreatReported` event's `blobId` to the full AI report stored on Walrus decentralized storage:

```typescript
const report = await guard.retrieveThreatReport(
  't1iVCt4JxkS-dCM_Zfp4jy78yYNOLffxRsJLdoWCicU', // blobId from ThreatReported event
  '0x08108c7412210ef9816aea2de0899f2dcad6f521631f314ab1fa29bf353af9a4' // blobObjectId (optional)
);

console.log(report.riskLevel);    // 'RED'
console.log(report.reasons);      // ['Intent mismatch detected', ...]
console.log(report.plainEnglish); // Full AI explanation
```

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

### `queryThreats(options?): Promise<{ threats, count }>`

| Option | Type | Description |
|---|---|---|
| `category` | `string` | Filter: `Honeypot`, `Phishing`, `Rug Pull`, `Intent Mismatch`, `Unknown` |
| `severity` | `string` | Filter: `Critical`, `High`, `Medium`, `Low` |
| `limit` | `number` | Max results (default 50) |
| `offset` | `number` | Pagination offset |

### `getThreatStats(): Promise<{ stats }>`

Returns aggregated threat counts by category and severity.

### `subscribeToThreats(callback): () => void`

Subscribes to real-time `ThreatReported` events via SSE. Returns an unsubscribe function.

### `registerWebhook(url, events, apiKey): Promise<{ webhook }>`

| Param | Type | Description |
|---|---|---|
| `url` | `string` | Your endpoint to receive threat notifications |
| `events` | `string[]` | e.g. `['ThreatReported', 'ThreatVerified']` |
| `apiKey` | `string` | Your API key for authentication |

### `getWebhooks(): Promise<{ webhooks }>`

Returns all registered webhooks.

### `reindexThreats(): Promise<{ indexed, stats }>`

Force re-index all `ThreatReported` events from the blockchain.

### `getIndexerStats(): Promise<{ total, byCategory, bySeverity }>`

Returns current indexer cache stats.

### `getAnalytics(): Promise<{ totalScans, scamsBlocked, threats }>`

Returns platform-wide analytics including threat stats.

### `getBlobHealth(): Promise<{ total, healthy, expiring, expired }>`

Checks Walrus blob expiration status for all indexed threats.

### `retrieveThreatReport(blobId, blobObjectId?): Promise<ThreatReport>`

| Param | Type | Description |
|---|---|---|
| `blobId` | `string` | Walrus blob ID from `ThreatReported` event |
| `blobObjectId` | `string` | Optional Sui Blob NFT object ID — enables liveness gate |

## REST API

The underlying REST API is fully open:

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

# Query indexed threats
curl "https://vibeguardai.vercel.app/api/threats"
curl "https://vibeguardai.vercel.app/api/threats?category=Honeypot&severity=High"
curl "https://vibeguardai.vercel.app/api/threats?stats=true"
curl "https://vibeguardai.vercel.app/api/threats?packageId=0x..."

# Real-time threat stream (SSE)
curl "https://vibeguardai.vercel.app/api/events"

# Retrieve threat evidence from Walrus
curl "https://vibeguardai.vercel.app/api/threat/<blobId>"
```

Full API docs: [vibeguardai.vercel.app/api-docs](https://vibeguardai.vercel.app/api-docs)

## On-Chain Threat Registry

Every `RED` detection automatically registers the malicious package on the VibeGuard `ReputationRegistry` Move contract on Sui Testnet, emitting a `ThreatReported` event with a Walrus blob reference. Wallet providers and dApps can subscribe to this event feed as a real-time security signal.

The threat engine runs inside an AWS Nitro Enclave TEE and detects sophisticated attack patterns:

- `INTENT_MISMATCH_HONEYPOT` — user expects inflow but simulation shows outflow
- `MULTI_RECIPIENT_DRAIN` — assets routed to 3+ unique recipients
- `DRAIN_FUNCTION` — dangerous Move functions: `transfer_all`, `drain`, `sweep`, `approve_all`, `emergency_withdraw`
- `UNEXPECTED_OUTFLOW` — unexpected asset outflow against stated intent
- `HIGH_GAS_BUDGET` — gas budget exceeds 500M MIST

**Performance:** 218.98 req/s max throughput, 226ms avg response time, 0.00% error rate at 50 concurrent requests.

- [ReputationRegistry on Sui Testnet](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be)
- [Enclave Registration](https://suiscan.xyz/testnet/tx/DyCyjEm6zc4AhmW6MquPAy72GjgLjJzokybjmUWj39Q2)
- [Live Atomic Threat Report](https://suiscan.xyz/testnet/tx/6qBWeX62UUzxm6GromBfo6fwXsNNNYjh9WbzfTrJqYDk)
- [Live Platform](https://vibeguardai.vercel.app)
- [Threat Intelligence Portal](https://vibeguardai.vercel.app/report)
- [B2B Dashboard](https://vibeguardai.vercel.app/dashboard)

## License

MIT
