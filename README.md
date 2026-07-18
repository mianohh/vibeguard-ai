<div align="center">

# VibeGuard AI

### Pre-Transaction Security Layer for the Sui Blockchain

[![Status](https://img.shields.io/badge/Status-Live_on_Sui_Testnet-00FFA3)](https://vibeguardai.vercel.app)
[![Compute](https://img.shields.io/badge/Compute-GCP_Confidential_VM_(SEV--SNP)-4DA2FF)](https://cloud.google.com/confidential-computing)
[![npm](https://img.shields.io/npm/v/vibeguard-sui-security?color=4DA2FF)](https://www.npmjs.com/package/vibeguard-sui-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Eliminate blind signing. Analyze every transaction before you sign.**

[Live Platform](https://vibeguardai.vercel.app) · [API Documentation](https://vibeguardai.vercel.app/api-docs) · [Threat Reporting](https://vibeguardai.vercel.app/report)

</div>

---

## Overview

VibeGuard AI is a pre-signature security primitive that intercepts opaque transaction payloads, simulates precise asset flows, and translates complex Move object mutations into deterministic risk signals — before the user ever signs.

The system combines live blockchain simulation, a sovereign Rust-based threat engine running inside GCP Confidential VMs (AMD SEV-SNP), and decentralized evidence storage to protect users from honeypots, asset drains, and phishing vectors.

Detected threats are automatically signed by the enclave and registered on-chain, creating a trustless, cryptographic B2B security feed for wallets and dApps.

---

## Quick Start

### SDK Installation

```bash
npm install vibeguard-sui-security
```

### Transaction Analysis

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop',
});

if (result.risk.riskLevel === 'RED') {
  // Block transaction — threat detected and auto-reported on-chain
}
```

### REST API

```bash
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "transactionBytes": "AAACAA...",
    "network": "mainnet",
    "userIntent": "Claim airdrop"
  }'
```

Full SDK documentation, integration examples, and API reference are available at [vibeguardai.vercel.app/api-docs](https://vibeguardai.vercel.app/api-docs).

---

## Architecture

### System Overview

```
User submits transaction bytes
        │
        ▼
┌─────────────────────────────────────┐
│  Simulation Engine                  │
│  dryRunTransactionBlock → map flows │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Threat Analysis                    │
│  Rust LocalThreatAgent in GCP TEE   │
│  Deterministic scoring engine       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Cryptographic Signing              │
│  Enclave Ed25519 keypair signs      │
│  evidence payload                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Decentralized Storage              │
│  Evidence JSON → Walrus Blob ID     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  On-Chain Registration              │
│  seal_enclave::verify_and_report    │
│  registry::report_malicious_contract│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  B2B Threat Feed                    │
│  Wallets subscribe to               │
│  ThreatReported events              │
└─────────────────────────────────────┘
```

### Component Details

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Simulation Engine | `dryRunTransactionBlock` | Live state simulation with asset flow mapping |
| Threat Agent | Rust / GCP SEV-SNP TEE | Deterministic threat scoring in isolated compute |
| Evidence Storage | Walrus Protocol | Immutable, decentralized blob storage |
| On-Chain Registry | Sui Move Contracts | Cryptographic verification and threat commitment |
| Access Control | Sui Seal | PCR-based encrypted config for approved enclaves only |
| Authentication | zkLogin | Google OAuth for frictionless community reporting |

---

## B2B Integration

Three integration options for wallets and dApps:

### Option 1 — Event Subscription

Subscribe to `ThreatReported` events to automatically blacklist malicious packages in real time.

```typescript
client.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::registry::ThreatReported`,
  },
  onMessage: (event) => {
    const { malicious_package_id, severity } = event.parsedJson;
    blacklistPackage(malicious_package_id);
  },
});
```

### Option 2 — Pre-Transaction Analysis

Integrate the SDK into your signing flow to block RED-risk transactions before the user signs.

### Option 3 — On-Chain Registry Query

Query the `ReputationRegistry` directly to check if a package is flagged before executing any transaction.

Full event schemas and integration guides are documented at [vibeguardai.vercel.app/api-docs](https://vibeguardai.vercel.app/api-docs).

---

## Security Model

### Seal Access Control

VibeGuard implements Pattern 4 — Secure Input Layer for Verified Compute from the Sui Seal module. The proprietary threat-agent configuration (scoring weights, risk thresholds, heuristic rules) is encrypted under a PCR-based Seal policy. Only an enclave whose PCR measurements match the registered policy can decrypt and use it.

| Step | Requirement | Implementation |
|------|-------------|----------------|
| 1 | Secret encrypted under a policy | `scripts/seal-setup.ts` encrypts agent config under PCR-based Seal policy |
| 2 | Approved enclave registered | `seal_enclave::register_enclave()` stores PCRs + public key on-chain |
| 3 | Only approved enclave can decrypt | Seal key servers verify PCR measurements before returning key shares |
| 4 | Enclave returns signed output | Ed25519 keypair signs `malicious_package_id + walrus_blob_id + timestamp_ms` |
| 5 | Output verified on-chain | `seal_enclave::verify_and_report()` verifies signature before emitting `ThreatVerified` |

### TEE Abstraction Layer

A modular `TeeProvider` trait separates cloud-specific attestation from core threat analysis:

```rust
pub trait TeeProvider: Send + Sync {
    fn compute_pcrs(&self) -> Result<(String, String, String)>;
    fn provider_name(&self) -> &str;
    fn mode(&self) -> TeeMode;
    fn attest(&self) -> Result<AttestationProof>;
}
```

| Provider | Trust Anchor | Use Case |
|----------|-------------|----------|
| `GcpSevProvider` | vTPM device (fallback: binary hash) | Production on GCP Confidential VMs |
| `SimulationProvider` | Binary hash (rejects production) | Local development and testing |

Selection is automatic via `VIBEGUARD_TEE_MODE` env var or compile-time `cfg!(debug_assertions)`.

### Security Guarantees

- **Sovereign Execution** — Core threat analysis runs inside an isolated GCP Confidential VM with AMD SEV-SNP hardware attestation
- **Zero Private Key Exposure** — Analyzes unsigned bytes only
- **Hardware-Grade Access Control** — Proprietary agent config encrypted under PCR-based Seal policies
- **Gasless Reporting** — Sponsored Transactions and zkLogin enable frictionless community reporting at zero user cost
- **Cryptographic Attestation** — Every automated threat registration is signed by the registered enclave keypair and verified on-chain (Ed25519)
- **Client-Side Verification** — TypeScript SDK verifies enclave signatures using `@noble/ed25519` against the registered public key

---

## Performance

### Production Enclave Benchmarks

Load tested on GCP Confidential VM (n2d-standard-4) with AMD SEV-SNP:

| Concurrency | Throughput | Avg Response | P95 | P99 | Error Rate |
|-------------|-----------|--------------|-----|-----|------------|
| 1 | 4.30 req/s | 232ms | 297ms | 323ms | 0.00% |
| 5 | 22.05 req/s | 226ms | 245ms | 454ms | 0.00% |
| 10 | 43.12 req/s | 230ms | 269ms | 480ms | 0.00% |
| 25 | 109.87 req/s | 226ms | 251ms | 463ms | 0.00% |
| 50 | 218.98 req/s | 226ms | 242ms | 540ms | 0.00% |

### Threat Detection Accuracy

100% detection rate across all adversarial test patterns:

| Flag | Pattern |
|------|---------|
| `INTENT_MISMATCH_HONEYPOT` | User expects inflow but simulation shows outflow |
| `MULTI_RECIPIENT_DRAIN` | Assets routed to 3+ unique recipients |
| `DRAIN_FUNCTION` | Dangerous Move functions: `transfer_all`, `drain`, `sweep`, `approve_all` |
| `UNEXPECTED_OUTFLOW` | Asset outflow contradicts stated intent |
| `HIGH_GAS_BUDGET` | Gas budget exceeds 500M MIST |

### PTB Batching

Programmable Transaction Block batching reduces gas costs by 96% for automated threat reporting:

| Metric | Value |
|--------|-------|
| API Response Time | 5ms (instant feedback) |
| Batch Window | 1000ms (configurable) |
| Max Batch Size | 5 reports |
| Gas Savings | 96% vs individual transactions |

---

## Deployed Contracts

| Component | Address |
|-----------|---------|
| ReputationRegistry Package | [`0xa706a721...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| ReputationRegistry Object | [`0xf172e861...495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| SealEnclave Package | [`0x75f9626c...19fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| EnclaveConfig Object | [`0x2ca9a5fe...c502`](https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502) |

### Verified Transactions

| Event | Transaction |
|-------|-------------|
| GCP Enclave PCR Registration | [`7SJNRpNt...B8QU`](https://suiscan.xyz/testnet/tx/7SJNRpNtJMMxT2KFWWZ1JcHDRDWtAU7rHik161yLB8QU) |
| Full Pipeline RED Signal Test | [`2DmCYg4K...T3X`](https://suiscan.xyz/testnet/tx/2DmCYg4KwJoBUjvyENk7YXwRwSKNTXfEwm53SYgm9T3X) |
| PTB Batch Verification (5 reports) | [`2sTnAxD9...jetQ`](https://suiscan.xyz/testnet/tx/2sTnAxD9uSBGUuRQ1ydzAi6UHvk7aC7zgj9UaUazjetQ) |

### Production Enclave

| Property | Value |
|----------|-------|
| Endpoint | `http://136.112.189.77:3000` |
| Provider | `gcp_sev` (AMD SEV-SNP) |
| Public Key | `4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29` |

---

## Environment Variables

```env
# Sui RPC
SUI_RPC_URL=https://sui-testnet.publicnode.com
NEXT_PUBLIC_SUI_RPC_URL=https://sui-testnet.publicnode.com

# zkLogin (Google OAuth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id

# Smart Contracts
NEXT_PUBLIC_PACKAGE_ID=0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de
NEXT_PUBLIC_REGISTRY_ID=0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be
SEAL_ENCLAVE_PACKAGE_ID=0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc
ENCLAVE_CONFIG_OBJECT_ID=0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502

# Nautilus Enclave (GCP Confidential VM)
ENCLAVE_URL=http://136.112.189.77:3000
ENCLAVE_PUBLIC_KEY=4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29

# Redis
REDIS_URL=redis://default:password@host:port

# Sponsor Wallet (gasless transactions)
SPONSOR_PRIVATE_KEY=your_key
```

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checks
npx tsc --noEmit
```

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/                # API routes (explain, sponsor, flush, status, etc.)
│   ├── components/         # React components
│   │   ├── home/           # Landing page sections
│   │   └── layout/         # Header, Footer
│   ├── dashboard/          # Threat intelligence dashboard
│   ├── demo/               # Interactive demo
│   ├── report/             # Community threat reporting
│   ├── status/             # System health status
│   └── globals.css         # Design system & theme tokens
├── lib/                    # Server-side logic
│   ├── risk-engine.ts      # Core risk analysis
│   ├── simulator.ts        # Transaction simulation
│   ├── walrus.ts           # Walrus protocol integration
│   ├── threat-indexer.ts   # Event indexing for B2B queries
│   └── reputation.ts       # On-chain reputation checks
├── packages/sdk/           # Published npm package
├── src/nautilus-server/    # Rust TEE threat engine
└── scripts/                # Setup and deployment scripts
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built to secure the Sui ecosystem.

**Alex Miano** · [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) · [Telegram](https://t.me/miano369) · [vibeguardai.vercel.app](https://vibeguardai.vercel.app)

</div>
