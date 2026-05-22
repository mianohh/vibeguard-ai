# VibeGuard AI

**Hardware-Secured Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

[![Status](https://img.shields.io/badge/Status-Live_on_Sui_Testnet-green.svg)](https://vibeguardai.vercel.app)
[![Compute](https://img.shields.io/badge/Compute-AWS_Nitro_Enclaves-orange.svg)](https://aws.amazon.com/ec2/nitro/nitro-enclaves/)
[![npm](https://img.shields.io/npm/v/vibeguard-sui-security.svg)](https://www.npmjs.com/package/vibeguard-sui-security)
[![npm downloads](https://img.shields.io/npm/dw/vibeguard-sui-security.svg)](https://www.npmjs.com/package/vibeguard-sui-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

VibeGuard AI is a pre-signature security primitive designed to eliminate blind signing. By combining live blockchain simulation, a sovereign Rust-based threat engine running inside AWS Nitro Enclaves, and decentralized storage, VibeGuard protects users from honeypots before a signature is ever broadcast. Detected threats are automatically signed by the enclave and registered on-chain, creating a trustless, cryptographic B2B security feed for wallets and dApps.

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
- **Nautilus Verified Compute (AWS Nitro Enclaves)**: The core Rust threat agent (`src/nautilus-server`) executes entirely inside an isolated TEE, communicating via native `AF_VSOCK`. Analysis is deterministic and pattern-based — no external API dependencies.
- **Cryptographic Attestation**: Upon detecting a threat, the enclave signs the evidence payload with its registered Ed25519 keypair.
- **Walrus Decentralized Storage**: Rich threat evidence is stored immutably as JSON blobs on the Walrus protocol.
- **On-Chain Core (Seal & Registry)**: The `ReputationRegistry` and `SealEnclave` Move contracts verify the enclave's Ed25519 signature against registered PCR measurements before committing any threat.

### The Execution Pipeline

```text
[ User Submits TX Bytes ]
        |
[ Enclave Simulation ] dryRunTransactionBlock -> Map asset flows
        |
[ Threat Analysis ] Rust LocalThreatAgent in AWS Nitro Enclave — deterministic scoring
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
| **Production Enclave Registration (May 15, 2026)** | [`DyCyjEm6...39Q2`](https://suiscan.xyz/testnet/tx/DyCyjEm6zc4AhmW6MquPAy72GjgLjJzokybjmUWj39Q2) |
| **Atomic Threat Report (ThreatVerified + ThreatReported)** | [`6qBWeX62...YDk`](https://suiscan.xyz/testnet/tx/6qBWeX62UUzxm6GromBfo6fwXsNNNYjh9WbzfTrJqYDk) |

**Production Enclave**

| Property | Value |
|---|---|
| Endpoint | `http://98.82.186.207:3000` |
| Public Key | `fca7f87123c37761226ea680dc2dc7d7dcf4378ee72cddde3094302b33685acd` |
| PCR0/PCR1 | `cf2c632b8610f9ede51dc20a78d01aa2d813410affec09a51726b52ccc4be49fb69c04ac6eb8b83a38dac821d14a98db` |
| PCR2 | `21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c10edb30948c90ba67310f7b964fc500a` |

---

## Performance & Scalability

### Production Enclave Performance

Load tested on May 15, 2026 against production enclave at `http://98.82.186.207:3000`:

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

## Security Guarantees

- **Sovereign Execution**: Core threat analysis runs inside an isolated AWS Nitro Enclave — no external API dependencies.
- **Zero Private Key Exposure**: Analyzes unsigned bytes only.
- **Hardware-Grade Access Control**: Proprietary agent config encrypted under PCR-based Seal policies — inaccessible outside the approved enclave.
- **Gasless Reporting**: Sponsored Transactions and zkLogin enable frictionless community reporting at zero user cost.
- **Cryptographic Attestation**: Every automated threat registration is signed by the registered enclave keypair and verified on-chain before registry commitment.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

Built to secure the Sui ecosystem. For wallet integration, enterprise API tiers, or B2B inquiries:

**Founder**: Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)
**Platform**: [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
