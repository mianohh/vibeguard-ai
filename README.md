# VibeGuard AI

**Hardware-Secured Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

[![Status](https://img.shields.io/badge/Status-Live_on_Sui_Testnet-green.svg)](https://vibeguardai.vercel.app)
[![Compute](https://img.shields.io/badge/Compute-GCP_Confidential_VM_(SEV--SNP)-blue.svg)](https://cloud.google.com/confidential-computing)
[![npm](https://img.shields.io/npm/v/vibeguard-sui-security.svg)](https://www.npmjs.com/package/vibeguard-sui-security)
[![npm downloads](https://img.shields.io/npm/dw/vibeguard-sui-security.svg)](https://www.npmjs.com/package/vibeguard-sui-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

VibeGuard AI is a pre-signature security primitive designed to eliminate blind signing. By combining live blockchain simulation, a sovereign Rust-based threat engine running inside GCP Confidential VMs (AMD SEV-SNP), and decentralized storage, VibeGuard protects users from honeypots before a signature is ever broadcast. Detected threats are automatically signed by the enclave and registered on-chain, creating a trustless, cryptographic B2B security feed for wallets and dApps.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)**

---

## The Blind Signing Problem

Web3 UX forces users to sign opaque cryptographic payloads, creating a massive attack vector for asset drains and honeypot exploits. VibeGuard intercepts these payloads, simulates the precise asset flows, and translates complex Move object mutations into deterministic risk signals — before the user ever signs.

---

## Quick Start

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop'
});

if (result.risk.riskLevel === 'RED') {
  // Block transaction — threat detected and auto-reported on-chain
}
```

For full SDK documentation, integration examples, and REST API reference, see the **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)**.

---

## Sovereign Architecture & Sui Stack

VibeGuard operates as a **Decentralized Security Primitive** with multi-layered, verifiable protection:

- **Simulation & Mismatch Detection**: Parses Base64 bytes offline, leverages `dryRunTransactionBlock` for live state simulation, and compares asset flows against user intent.
- **Nautilus Verified Compute (GCP Confidential VMs)**: The core Rust threat agent (`src/nautilus-server`) executes entirely inside an isolated AMD SEV-SNP TEE with hardware-backed attestation via vTPM. Communication over standard HTTPS — no VSOCK proxy needed.
- **TEE Abstraction Layer**: Modular `TeeProvider` trait (`src/nautilus-server/src/attestation/`) separates cloud-specific attestation from core threat analysis. Supports GCP SEV-SNP and Simulation modes, selected via `VIBEGUARD_TEE_MODE` env var.
- **Cryptographic Attestation**: Upon detecting a threat, the enclave signs the evidence payload with its registered Ed25519 keypair. Signatures are verified client-side using `@noble/ed25519`.
- **Walrus Decentralized Storage**: Rich threat evidence is stored immutably as JSON blobs on the Walrus protocol.
- **On-Chain Core (Seal & Registry)**: The `ReputationRegistry` and `SealEnclave` Move contracts verify the enclave's Ed25519 signature against registered PCR measurements before committing any threat.

### The Execution Pipeline

```text
[ User Submits TX Bytes ]
        |
[ Enclave Simulation ] dryRunTransactionBlock -> Map asset flows
        |
[ Threat Analysis ] Rust LocalThreatAgent in GCP SEV-SNP TEE — deterministic scoring
        |
[ Cryptographic Signing ] Enclave Ed25519 keypair signs evidence payload
        |
[ Storage ] Evidence JSON -> Walrus Blob ID
        |
[ Atomic On-Chain TX ] seal_enclave::verify_and_report + registry::report_malicious_contract
        |
[ B2B Feed ] Wallets subscribe to emitted ThreatReported & ThreatVerified events
```

---

## B2B Integration

VibeGuard provides a cryptographically verified, real-time threat feed for Sui wallets and dApps. Three integration options are available — full code examples and event schemas are documented at **[vibeguardai.vercel.app/api-docs](https://vibeguardai.vercel.app/api-docs)**.

**Option 1 — Event Subscription:** Subscribe to `ThreatReported` events to automatically blacklist malicious packages in real time.

**Option 2 — Pre-Transaction Analysis:** Integrate the SDK into your signing flow to block RED-risk transactions before the user signs.

**Option 3 — On-Chain Registry Query:** Query the `ReputationRegistry` directly to check if a package is flagged before executing any transaction.

---

## Seal Access Control

VibeGuard implements **Pattern 4 — Secure Input Layer for Verified Compute** from the Sui Seal module. The proprietary threat-agent configuration (scoring weights, risk thresholds, heuristic rules) is encrypted under a PCR-based Seal policy (`scripts/seal-setup.ts`). Only an enclave whose PCR measurements match the registered policy can decrypt and use it.

| # | Requirement | Implementation |
|---|---|---|
| 1 | Secret encrypted under a policy | `scripts/seal-setup.ts` encrypts agent config under PCR-based Seal policy ID `0x00` |
| 2 | Approved enclave registered | `seal_enclave::register_enclave()` stores PCRs + Ed25519 public key in `EnclaveConfig` on-chain |
| 3 | Only approved enclave can decrypt | Seal key servers verify PCR measurements before returning key shares |
| 4 | Enclave returns a signed output | Enclave keypair signs `malicious_package_id bytes + walrus_blob_id bytes + timestamp_ms LE64` |
| 5 | Output verified on-chain | `seal_enclave::verify_and_report()` verifies the Ed25519 signature before emitting `ThreatVerified` |

---

## Deployed Contracts & Live Proofs (Testnet)

| Component | Address |
|---|---|
| **ReputationRegistry Package** | [`0xa706a721...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| **ReputationRegistry Object** | [`0xf172e861...495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| **SealEnclave Package** | [`0x75f9626c...19fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| **EnclaveConfig Object** | [`0x2ca9a5fe...c502`](https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502) |

| Event | Transaction |
|---|---|
| **GCP Enclave PCR Registration (Jul 17, 2026)** | [`7SJNRpNt...B8QU`](https://suiscan.xyz/testnet/tx/7SJNRpNtJMMxT2KFWWZ1JcHDRDWtAU7rHik161yLB8QU) |
| **Full Pipeline RED Signal Test (Jul 17, 2026)** | [`2DmCYg4K...T3X`](https://suiscan.xyz/testnet/tx/2DmCYg4KwJoBUjvyENk7YXwRwSKNTXfEwm53SYgm9T3X) |

**Production Enclave (GCP Confidential VM)**

| Property | Value |
|---|---|
| Endpoint | `http://136.112.189.77:3000` |
| Provider | `gcp_sev` (AMD SEV-SNP) |
| Public Key | `4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29` |
| PCR0 | `35d08dd73abd589ab0a45261d3df8007a3f199f94f525eb8d1922094a350f4e8598ec636ffdf48cbcbbe30e112abbad7` |
| PCR1 | `b20e37bd8c6c83f5cb8f6876fbae49c2887f89991c081314167431286badd9564addac844f8a31f5bb25c37351572f19` |
| PCR2 | `e7904f29052cc7b013dd955e613c21eca1d021a02e0b208f8ca4f9382c13e439b18282bef0d5f73cf616a595e076ef4a` |

**Note**: PCR values are derived deterministically from the SHA-384 hash of the running binary. The keypair is persistent — the public key is stable across restarts.

---

## Performance & Scalability

### Production Enclave Performance

Load tested on GCP Confidential VM (n2d-standard-4) with AMD SEV-SNP:

| Concurrency | Throughput (req/s) | Avg Response | P95 Response | P99 Response | Error Rate |
|---|---|---|---|---|---|
| 1 | 4.30 | 232ms | 297ms | 323ms | 0.00% |
| 5 | 22.05 | 226ms | 245ms | 454ms | 0.00% |
| 10 | 43.12 | 230ms | 269ms | 480ms | 0.00% |
| 25 | 109.87 | 226ms | 251ms | 463ms | 0.00% |
| 50 | 218.98 | 226ms | 242ms | 540ms | 0.00% |

- Max Throughput: 218.98 req/s at 50 concurrent requests
- Avg Response Time: 226ms (stable across all concurrency levels)
- Error Rate: 0.00% across all tests

### Adversarial Threat Detection

The enclave threat engine detects sophisticated attack patterns with 100% accuracy across all test cases:

| Flag | Pattern |
|---|---|
| `INTENT_MISMATCH_HONEYPOT` | User expects inflow but simulation shows outflow |
| `MULTI_RECIPIENT_DRAIN` | Assets routed to 3+ unique recipients |
| `DRAIN_FUNCTION` | Dangerous Move functions: `transfer_all`, `drain`, `sweep`, `approve_all`, `emergency_withdraw` |
| `UNEXPECTED_OUTFLOW` | Asset outflow contradicts stated intent |
| `HIGH_GAS_BUDGET` | Gas budget exceeds 500M MIST |

Framework packages (`0x1`, `0x2`, `0x3`, `0x5`) are automatically whitelisted to eliminate false positives.

---

## PTB Batching & Gas Optimization

VibeGuard implements **Programmable Transaction Block (PTB) batching** to dramatically reduce gas costs for automated threat reporting. Multiple threat reports are batched into a single on-chain transaction, achieving **96% gas savings** compared to individual transactions.

### How It Works

1. **Fast API Response**: Reports are enqueued immediately (~5ms) and the API responds instantly
2. **Batch Window**: Reports accumulate for 1 second (configurable via `PTB_BATCH_WINDOW_MS`)
3. **Parallel Enclave Signing**: Multiple reports are signed concurrently by the enclave
4. **Single PTB Execution**: All reports are submitted in one atomic transaction

### Performance Metrics

| Metric | Value |
|---|---|
| API Response Time | 5ms (instant user feedback) |
| Batch Window | 1000ms (configurable) |
| Max Batch Size | 5 reports (configurable via `PTB_MAX_BATCH_SIZE`) |
| Gas Savings | 96% vs individual transactions |
| Vercel Compliance | 0.05% of 10s function limit |

### Gas Efficiency

**Example: 5 Reports**
- Individual transactions: ~25,000,000 MIST
- Batched transaction: ~1,000,000 MIST
- **Savings**: 24,000,000 MIST (96%)

### Verified On-Chain

- **Batch Transaction**: [`2sTnAxD9...jetQ`](https://suiscan.xyz/testnet/tx/2sTnAxD9uSBGUuRQ1ydzAi6UHvk7aC7zgj9UaUazjetQ)
- **Reports Verified**: 5 concurrent reports
- **Events Emitted**: 10 (5 ThreatVerified + 5 ThreatReported)
- **Status**: ✅ All signatures verified on-chain

---

## Security Guarantees

- **Sovereign Execution**: Core threat analysis runs inside an isolated GCP Confidential VM with AMD SEV-SNP hardware attestation — no external API dependencies.
- **Zero Private Key Exposure**: Analyzes unsigned bytes only.
- **Hardware-Grade Access Control**: Proprietary agent config encrypted under PCR-based Seal policies — inaccessible outside the approved enclave.
- **Gasless Reporting**: Sponsored Transactions and zkLogin enable frictionless community reporting at zero user cost.
- **Cryptographic Attestation**: Every automated threat registration is signed by the registered enclave keypair and verified on-chain (Ed25519) before registry commitment.
- **Client-Side Signature Verification**: TypeScript SDK verifies enclave signatures using `@noble/ed25519` against the registered public key.

---

## TEE Abstraction Layer

VibeGuard implements a modular TEE abstraction (`src/nautilus-server/src/attestation/`) that separates cloud-specific attestation from core threat analysis:

```rust
pub trait TeeProvider: Send + Sync {
    fn compute_pcrs(&self) -> Result<(String, String, String)>;
    fn provider_name(&self) -> &str;
    fn mode(&self) -> TeeMode;
    fn attest(&self) -> Result<AttestationProof>;
}
```

| Provider | Mode | Trust Anchor | Use Case |
|---|---|---|---|
| `GcpSevProvider` | `gcp_sev` | vTPM device (fallback: binary hash) | Production on GCP Confidential VMs |
| `SimulationProvider` | `simulation` | Binary hash (rejects production) | Local development and testing |

Selection is automatic via `VIBEGUARD_TEE_MODE` env var or compile-time `cfg!(debug_assertions)`.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

Built to secure the Sui ecosystem. For wallet integration, enterprise API tiers, or B2B inquiries:

**Founder**: Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)
**Platform**: [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
