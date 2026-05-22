# vibeguard-sui-security

Pre-signature transaction security for the Sui ecosystem. Analyzes unsigned transaction bytes before a user signs — detecting honeypots, asset drains, and intent mismatches via a sovereign Rust threat engine running inside an AWS Nitro Enclave.

Detected threats are automatically signed by the enclave and registered on-chain. No API key required.

**[Platform](https://vibeguardai.vercel.app)** | **[API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Portal](https://vibeguardai.vercel.app/report)**

---

## Installation

```bash
npm install vibeguard-sui-security
```

---

## Quick Start

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'mainnet',
  userAddress: '0xYourAddress',
  userIntent: 'Claim airdrop',
});

if (result.risk.riskLevel === 'RED') {
  // Block the transaction — threat detected and auto-reported on-chain
}
```

| Risk Level | Meaning |
|---|---|
| `GREEN` | Transaction appears safe |
| `YELLOW` | Proceed with caution |
| `RED` | High risk — block and warn user |

---

## Threat Detection

The enclave detects sophisticated attack patterns with 100% accuracy across all test cases:

| Flag | Pattern |
|---|---|
| `INTENT_MISMATCH_HONEYPOT` | User expects inflow but simulation shows outflow |
| `MULTI_RECIPIENT_DRAIN` | Assets routed to 3+ unique recipients |
| `DRAIN_FUNCTION` | Dangerous Move functions: `transfer_all`, `drain`, `approve_all`, `sweep` |
| `UNEXPECTED_OUTFLOW` | Asset outflow contradicts stated intent |
| `HIGH_GAS_BUDGET` | Gas budget exceeds 500M MIST |

**Enclave Performance:** 210 req/s peak throughput · 233ms avg response · 0.00% error rate at 50 concurrent requests.

---

## B2B Integration

### Subscribe to Threat Feed

```typescript
const unsubscribe = guard.subscribeToThreats((threat) => {
  walletBlacklist.add(threat.malicious_package_id);
});
```

### Query Threat Registry

```typescript
const { threats } = await guard.queryThreats({ category: 'Honeypot', severity: 'Critical' });
const { stats } = await guard.getThreatStats();
```

### Retrieve Threat Evidence

```typescript
const report = await guard.retrieveThreatReport(walrusBlobId, blobObjectId);
console.log(report.riskLevel);   // 'RED'
console.log(report.reasons);     // ['INTENT_MISMATCH_HONEYPOT', ...]
```

### Register Webhook

```typescript
await guard.registerWebhook('https://your-app.com/webhook', ['ThreatReported'], apiKey);
```

---

## REST API

```bash
# Analyze a transaction
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -d '{"transactionBytes":"AAACAA...","network":"mainnet","userAddress":"0x...","userIntent":"Claim airdrop"}'

# Query threats
curl "https://vibeguardai.vercel.app/api/threats?category=Honeypot"

# Real-time SSE stream
curl "https://vibeguardai.vercel.app/api/events"
```

---

## On-Chain Registry

Every `RED` detection triggers an atomic on-chain transaction:
1. Evidence uploaded to Walrus decentralized storage
2. Enclave signs the report with its registered Ed25519 keypair
3. `seal_enclave::verify_and_report` verifies the signature on-chain — emits `ThreatVerified { verified: true }`
4. `registry::report_malicious_contract` commits the threat — emits `ThreatReported`

Wallet providers subscribe to `ThreatReported` events for a real-time, cryptographically verified blacklist feed.

| Contract | Address |
|---|---|
| ReputationRegistry | [`0xa706a721...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| SealEnclave | [`0x75f9626c...19fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| Enclave Registration | [`DyCyjEm6...39Q2`](https://suiscan.xyz/testnet/tx/DyCyjEm6zc4AhmW6MquPAy72GjgLjJzokybjmUWj39Q2) |
| Live Threat Report | [`6qBWeX62...YDk`](https://suiscan.xyz/testnet/tx/6qBWeX62UUzxm6GromBfo6fwXsNNNYjh9WbzfTrJqYDk) |

---

## License

MIT
