<div align="center">

# VibeGuard AI

### Pre-transaction analysis for the Sui blockchain

[![Status](https://img.shields.io/badge/Status-Live_on_Sui_Testnet-00FFA3)](https://vibeguardai.xyz)
[![Compute](https://img.shields.io/badge/Compute-Oracle_A1_TEE-4DA2FF)](https://vibeguardai.xyz)
[![npm](https://img.shields.io/npm/v/vibeguard-sui-security?color=4DA2FF)](https://www.npmjs.com/package/vibeguard-sui-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Platform](https://vibeguardai.xyz) · [API Docs](https://vibeguardai.xyz/api-docs) · [Report a scam](https://vibeguardai.xyz/report)

</div>

---

## Overview

VibeGuard simulates a Sui transaction before it is signed, extracts its effects, and applies a set of deterministic risk checks. The result is a signed analysis record the user or integrating application can verify independently.

The core pipeline:

1. **Simulate** — runs the unsigned transaction against live Sui state via gRPC, extracting balance changes, transfers, and Move calls.
2. **Analyze** — applies 13 deterministic checks across asset outflows, intent mismatch, permission changes, and known-risk patterns.
3. **Sign** — the result is signed inside an attested execution enclave using an Ed25519 keypair registered on-chain.
4. **Preserve** — flagged transactions are uploaded to Walrus and anchored on Sui via `registry::report_malicious_contract`.

---

## Quick start

### SDK

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'testnet',
  userAddress: '0x...',
  userIntent: 'Claim airdrop',
});

if (result.risk.riskLevel === 'RED') {
  // Block signing — high-risk indicators detected
}
```

### REST API (no key required)

```bash
curl -X POST https://vibeguardai.xyz/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBytes": "AAACAA...",
    "network": "testnet",
    "userIntent": "Claim airdrop"
  }'
```

Full reference at [vibeguardai.xyz/api-docs](https://vibeguardai.xyz/api-docs).

---

## Architecture

```
unsigned transaction bytes
        │
        ▼
┌─────────────────────────────────┐
│  Simulation                     │
│  gRPC dryRun → asset flow map   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Risk analysis                  │
│  13 deterministic checks        │
│  Rust threat engine in TEE      │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Signing                        │
│  Enclave Ed25519 signs payload  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Storage                        │
│  Evidence blob uploaded to      │
│  Walrus                         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  On-chain registration          │
│  seal_enclave::verify_and_report│
│  registry::report_malicious_    │
│  contract                       │
└─────────────────────────────────┘
```

### Components

| Component | Technology | Role |
|-----------|-----------|------|
| Simulation engine | Sui gRPC `simulateTransaction` | Live state simulation with asset flow mapping |
| Threat agent | Rust, Oracle A1 TEE | Deterministic risk scoring in isolated compute |
| Evidence storage | Walrus Protocol | Decentralized blob storage for analysis records |
| On-chain registry | Sui Move | Signature verification and threat commitment |
| Access control | Sui Seal | PCR-based encrypted config for approved enclaves only |
| Authentication | zkLogin | Google OAuth for community reporting |

---

## B2B integration

### Option 1: Event subscription

Subscribe to `ThreatReported` events to receive new threat registrations in real time.

```typescript
client.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::registry::ThreatReported`,
  },
  onMessage: (event) => {
    const { malicious_package_id } = event.parsedJson;
    blacklistPackage(malicious_package_id);
  },
});
```

### Option 2: Pre-signature analysis

Call `/api/explain` before presenting a signing prompt. Block or warn based on `riskLevel`.

### Option 3: On-chain registry query

Query the `ReputationRegistry` directly to check if a package is flagged before constructing a transaction.

Full schemas and integration guides at [vibeguardai.xyz/api-docs](https://vibeguardai.xyz/api-docs).

---

## Security model

### Seal access control

The threat-agent configuration (scoring weights, risk thresholds, heuristic rules) is encrypted under a PCR-based Seal policy. Only an enclave whose PCR measurements match the registered policy can decrypt and load it.

| Step | Action |
|------|--------|
| 1 | Agent config encrypted under Seal policy via `scripts/seal-setup.ts` |
| 2 | Approved enclave registered via `seal_enclave::register_enclave()`, storing PCRs and Ed25519 public key on-chain |
| 3 | Seal key servers verify PCR measurements before returning key shares |
| 4 | Enclave signs output: `address_bytes(32) + blob_id_bytes + timestamp_ms_le64` |
| 5 | `seal_enclave::verify_and_report()` verifies the signature before emitting `ThreatVerified` |

### TEE abstraction

The Rust server uses a `TeeProvider` trait to separate attestation from analysis logic:

```rust
pub trait TeeProvider: Send + Sync {
    fn compute_pcrs(&self) -> Result<(String, String, String)>;
    fn provider_name(&self) -> &str;
    fn mode(&self) -> TeeMode;
    fn attest(&self) -> Result<AttestationProof>;
}
```

| Provider | Trust anchor | Use case |
|----------|-------------|----------|
| `OracleA1Provider` | Binary hash measurement | Production on Oracle A1 |
| `SimulationProvider` | Binary hash (rejects production calls) | Local development |

The active provider is selected via `VIBEGUARD_TEE_MODE` or `cfg!(debug_assertions)` at compile time.

### Design notes

- Analyzes **unsigned** bytes only — no private key access at any point.
- Analysis records are signed by the enclave and verifiable against the on-chain public key.
- Proprietary agent config is inaccessible outside the approved enclave.
- Community reporting uses sponsored transactions and zkLogin — zero cost to the reporter.
- Enclave signatures are verified client-side via `@noble/ed25519` against the registered public key.

---

## Risk flags

| Flag | Condition |
|------|-----------|
| `INTENT_MISMATCH_HONEYPOT` | User expects inflow, simulation shows outflow |
| `MULTI_RECIPIENT_DRAIN` | Assets routed to 3 or more unique recipients |
| `DRAIN_FUNCTION` | Move call names matching: `transfer_all`, `drain`, `sweep`, `approve_all` |
| `UNEXPECTED_OUTFLOW` | Asset outflow inconsistent with stated intent |
| `HIGH_GAS_BUDGET` | Gas budget exceeds 500M MIST |

---

## Deployed contracts

| Component | Address |
|-----------|---------|
| ReputationRegistry Package | [`0xa706...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| ReputationRegistry Object | [`0xf172...495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| SealEnclave Package | [`0x75f9...19fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| EnclaveConfig Object | [`0x2ca9...c502`](https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502) |

### Verified transactions

| Event | Digest |
|-------|--------|
| Oracle enclave PCR registration | [`9Dpg1V8B...K1B7`](https://suiscan.xyz/testnet/tx/9Dpg1V8BVyu3QtfYh2Uxj31gTm8ehzjUwQVWXDiuK1B7) |
| Atomic threat report (ThreatVerified + ThreatReported) | [`CuBdpZ2p...mqw`](https://suiscan.xyz/testnet/tx/CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw) |
| zkLogin community report | [`57hge1tQ...7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R) |

### Production enclave

| Property | Value |
|----------|-------|
| Endpoint | `http://92.4.140.187:3000` |
| Provider | Oracle A1 (x86_64, simulation mode) |
| Public key | `a1609cce97d528ebe898e42c3c6fff37309f6f8c7efc0bbd73dfab1e564ac309` |

---

## Environment variables

```env
# Smart contracts
NEXT_PUBLIC_PACKAGE_ID=0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de
NEXT_PUBLIC_REGISTRY_ID=0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be
SEAL_ENCLAVE_PACKAGE_ID=0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc
ENCLAVE_CONFIG_OBJECT_ID=0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502

# Enclave
ENCLAVE_URL=http://92.4.140.187:3000
ENCLAVE_PUBLIC_KEY=a1609cce97d528ebe898e42c3c6fff37309f6f8c7efc0bbd73dfab1e564ac309

# zkLogin
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id

# Sponsor wallet (gasless reporting)
SPONSOR_PRIVATE_KEY=your_key

# Redis (background queue)
REDIS_URL=redis://default:password@host:port

# Alerting (optional)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npx eslint app

# Register enclave PCRs after a redeploy
npx tsx --env-file=.env.local scripts/register-pcrs-production.ts
```

### Project structure

```
├── app/
│   ├── api/                # API routes
│   ├── components/         # React components
│   │   ├── home/           # Landing page sections
│   │   ├── layout/         # Header, Footer
│   │   └── ui/             # Design system components
│   ├── dashboard/          # Threat intelligence dashboard
│   ├── demo/               # Interactive demo
│   ├── report/             # Community reporting
│   ├── status/             # System health
│   └── globals.css         # Design tokens and theme
├── lib/                    # Server-side logic
│   ├── risk-engine.ts      # Risk analysis
│   ├── simulator.ts        # Transaction simulation
│   ├── sui-rpc.ts          # Sui gRPC/GraphQL adapter
│   ├── walrus.ts           # Walrus integration
│   ├── threat-indexer.ts   # On-chain event indexing
│   └── reputation.ts       # Registry lookups
├── packages/sdk/           # npm package
├── src/nautilus-server/    # Rust TEE server
├── move/                   # Move contracts
└── scripts/                # Deployment and maintenance scripts
```

---

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">

Built on Sui and Walrus.

**Alex Miano** · [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) · [Telegram](https://t.me/miano369) · [vibeguardai.xyz](https://vibeguardai.xyz)

</div>
