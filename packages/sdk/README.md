# vibeguard-sui-security

[![npm version](https://img.shields.io/npm/v/vibeguard-sui-security.svg)](https://www.npmjs.com/package/vibeguard-sui-security)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

TypeScript SDK for [VibeGuard AI](https://vibeguardai.xyz) — pre-signature transaction security for the Sui ecosystem.

VibeGuard analyzes unsigned transaction bytes before a user signs, returning a plain-English explanation of what the transaction actually does: simulated effects, static Move-call inspection, risk verdict, and recommended action. Confirmed `RED` detections are signed with the enclave's registered Ed25519 key and registered on-chain, giving integrators a cryptographically verifiable threat feed.

**[Platform](https://vibeguardai.xyz)** | **[API Docs](https://vibeguardai.xyz/api-docs)** | **[Threat Portal](https://vibeguardai.xyz/report)**

---

## Features

- **Pre-signature analysis** — detect honeypots, asset drains, and intent mismatches before a transaction is signed
- **Plain-English explanations** — headline, bullet points, and recommended action for every verdict
- **Verifiable evidence** — threat reports stored on Walrus, signed by the enclave, verified on-chain
- **Real-time threat feed** — SSE stream and webhooks for `ThreatReported` events
- **Typed responses** — full TypeScript definitions for every endpoint
- **Zero runtime dependencies** — built on native `fetch`, ships ESM and CommonJS

---

## Installation

```bash
npm install vibeguard-sui-security
```

Requires Node.js 18 or later (`subscribeToThreats` additionally requires `EventSource`: Node.js 22+, a browser, or a polyfill).

---

## Quick Start

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'testnet',
  userAddress: '0xYourAddress',
  userIntent: 'Claim airdrop',
});

if (result.risk.riskLevel === 'RED') {
  // Block the transaction — threat is auto-reported on-chain by the backend
}
console.log(result.explanation.plainEnglish);
```

| Risk Level | Meaning |
|---|---|
| `GREEN` | Transaction appears safe |
| `YELLOW` | Proceed with caution |
| `RED` | High risk — block and warn the user |

---

## Error Handling

All failures throw a `VibeGuardError` with a machine-readable `code` and, for HTTP failures, the response `status`:

```typescript
import { VibeGuard, VibeGuardError } from 'vibeguard-sui-security';

try {
  await guard.analyzeTransaction({ transactionBytes: '', network: 'testnet' });
} catch (error) {
  if (error instanceof VibeGuardError) {
    console.error(error.code, error.status, error.message);
    // 'BAD_REQUEST' — inputs are validated client-side before any request is sent
  }
}
```

| Code | Meaning |
|---|---|
| `BAD_REQUEST` | Invalid configuration or method argument |
| `TIMEOUT` | Request exceeded the configured timeout (default 15s) |
| `NETWORK` | Connection-level failure |
| `HTTP_ERROR` | Non-2xx response from the API (includes `status`) |
| `BAD_RESPONSE` | Response was not parseable JSON or had an unexpected shape |

---

## API Reference

| Method | Description |
|---|---|
| `analyzeTransaction(options)` | Pre-signature analysis of unsigned transaction bytes |
| `retrieveThreatReport(blobId, blobObjectId?)` | Fetch signed threat evidence from Walrus |
| `queryThreats(options?)` | Query the on-chain threat registry with filters |
| `getThreatStats()` | Aggregated registry statistics |
| `subscribeToThreats(cb, onError?)` | Real-time `ThreatReported` SSE stream (returns unsubscribe) |
| `registerWebhook(url, events, apiKey)` | Register a webhook endpoint |
| `getWebhooks()` | List registered webhooks |
| `reindexThreats()` | Trigger a threat-index refresh |
| `getIndexerStats()` | Raw indexer statistics |
| `getAnalytics()` | Platform analytics counters |
| `getBlobHealth()` | Walrus blob health status |

### Configuration

```typescript
const guard = new VibeGuard({
  baseUrl: 'https://vibeguardai.xyz', // default
  apiKey: 'optional-bearer-token',    // sent as Authorization header
  timeoutMs: 15_000,                  // per-request timeout, default 15s
});
```

---

## Threat Detection

The engine combines simulation, static byte-level inspection, and on-chain reputation data. Known attack patterns include:

| Flag | Pattern |
|---|---|
| `INTENT_MISMATCH_HONEYPOT` | User expects inflow but simulation shows outflow |
| `MULTI_RECIPIENT_DRAIN` | Assets routed to 3+ unique recipients |
| `DRAIN_FUNCTION` | Dangerous Move functions: `transfer_all`, `drain`, `approve_all`, `sweep` |
| `UNEXPECTED_OUTFLOW` | Asset outflow contradicts stated intent |
| `HIGH_GAS_BUDGET` | Gas budget exceeds 500M MIST |

*Reported from the project load tests (not independently reproduced): 210 req/s peak throughput, 233 ms average response, 0.00% error rate at 50 concurrent requests (testnet).*

---

## Threat Feed & Registry

```typescript
// Real-time feed
const unsubscribe = guard.subscribeToThreats((event) => {
  walletBlacklist.add(event.malicious_package_id);
});

// Query the registry
const { threats } = await guard.queryThreats({ category: 'Honeypot', severity: 'Critical' });
const { stats } = await guard.getThreatStats();

// Retrieve verifiable evidence
const report = await guard.retrieveThreatReport(walrusBlobId, blobObjectId);
console.log(report.riskLevel);   // 'RED'
console.log(report.reasons);     // ['INTENT_MISMATCH_HONEYPOT', ...]

// Webhooks
await guard.registerWebhook('https://your-app.com/webhook', ['ThreatReported'], apiKey);
```

### On-Chain Registry

Every `RED` detection triggers an atomic on-chain transaction:

1. Evidence uploaded to Walrus decentralized storage
2. Report signed with the enclave's registered Ed25519 keypair
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

## REST API

```bash
# Analyze a transaction
curl -X POST https://vibeguardai.xyz/api/explain \
  -H "Content-Type: application/json" \
  -d '{"transactionBytes":"AAACAA...","network":"testnet","userAddress":"0x...","userIntent":"Claim airdrop"}'

# Query threats
curl "https://vibeguardai.xyz/api/threats?category=Honeypot"

# Real-time SSE stream
curl "https://vibeguardai.xyz/api/events"
```

---

## Status & Limitations

- **Network:** on-chain components (registry, evidence, event feed) run on **Sui Testnet**.
- **Attestation:** the enclave public key is registered on-chain; hardware remote attestation (TEE) is in progress — attestation currently runs in **simulation mode**.
- **Decision support:** VibeGuard surfaces risk with an explanation and confidence score. It does not guarantee that a transaction is safe or malicious — users and integrators remain responsible for signing decisions.

---

## Development

```bash
npm install
npm run dev        # watch build
npm run typecheck  # tsc --noEmit
npm run verify     # typecheck + build + publint + arethetypeswrong
```

---

## License

[MIT](LICENSE)
