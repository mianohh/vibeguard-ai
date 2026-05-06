# VibeGuard AI

**Hardware-Secured Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

[![Status](https://img.shields.io/badge/Status-Live_on_Sui_Testnet-green.svg)]()
[![Compute](https://img.shields.io/badge/Compute-AWS_Nitro_Enclaves-orange.svg)]()
[![NPM](https://img.shields.io/badge/npm-vibeguard--sui--security-blue.svg)]()

VibeGuard AI is a pre-signature security primitive designed to eliminate blind signing. By combining live blockchain simulation, a sovereign Rust-based threat engine running inside AWS Nitro Enclaves, and decentralized storage, VibeGuard protects users from honeypots before a signature is ever broadcast. Detected threats are automatically signed by the enclave and registered on-chain, creating a trustless, cryptographic B2B security feed for wallets and dApps.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)**

---

## The Blind Signing Problem

Web3 UX forces users to sign opaque cryptographic payloads, creating a massive attack vector for asset drains and honeypot exploits. VibeGuard intercepts these payloads, simulates the precise asset flows, and translates complex Move object mutations into deterministic risk signals — before the user ever signs.

---

## ⚡ Quick Start

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

if (result.riskLevel === 'RED') {
  console.error('🚨 HONEYPOT DETECTED:', result.headline);
  // Short-circuit wallet signing flow
}
```

---

## Sovereign Architecture & Sui Stack

VibeGuard operates as a **Decentralized Security Primitive** with multi-layered, verifiable protection:

- **Simulation & Mismatch Detection**: Parses Base64 bytes offline, leverages `dryRunTransactionBlock` for live state simulation, and compares asset flows against user intent.
- **Nautilus Verified Compute (AWS Nitro Enclaves)**: The core Rust threat agent (`src/nautilus-server`) executes entirely inside an isolated TEE, communicating via native `AF_VSOCK`. Analysis is deterministic and pattern-based — no external API dependencies.
- **Cryptographic Attestation**: Upon detecting a threat, the enclave signs the evidence payload with its registered Ed25519 keypair.
- **Walrus Decentralized Storage**: Rich threat evidence is stored immutably as JSON blobs on the Walrus protocol.
- **On-Chain Core (Seal & Registry)**: The `ReputationRegistry` and `SealEnclave` Move contracts verify the enclave's Ed25519 signature against registered PCR measurements before committing any threat.

### The Execution Pipeline

```
[ User Submits TX Bytes ]
        ↓
[ Enclave Simulation ] dryRunTransactionBlock → Map asset flows
        ↓
[ Threat Analysis ] Rust LocalThreatAgent in AWS Nitro Enclave — deterministic scoring
        ↓
[ Cryptographic Signing ] Enclave Ed25519 keypair signs evidence payload
        ↓
[ Storage ] Evidence JSON → Walrus Blob ID
        ↓
[ Atomic On-Chain TX ] seal_enclave::verify_and_report + registry::report_malicious_contract
        ↓
[ B2B Feed ] Wallets subscribe to emitted ThreatReported & ThreatVerified events
```

---

## B2B Ecosystem Feed

Wallets and ecosystem partners can natively subscribe to the VibeGuard smart contracts to instantly blacklist malicious packages across their entire user base.

```typescript
client.subscribeEvent({
  filter: { MoveEventType: `${REGISTRY_PACKAGE_ID}::registry::ThreatReported` },
  onMessage: async (event) => {
    const { malicious_package_id, walrus_blob_id } = event.parsedJson;

    // Fetch full contextual evidence from Walrus
    const evidence = await fetch(
      `https://aggregator.walrus-testnet.walrus.space/v1/${walrus_blob_id}`
    );

    walletBlacklist.add(malicious_package_id);
  }
});
```

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
| **ReputationRegistry Package** | [`0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| **ReputationRegistry Object** | [`0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| **SealEnclave Package** | [`0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| **EnclaveConfig Object** | [`0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502`](https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502) |

| Event | Transaction |
|---|---|
| **Production Enclave Registration** | [`BkwvNJevuWpQ8Cs1CWgfy4LkiRxts356CbMdgrTWHjBW`](https://suiscan.xyz/testnet/tx/BkwvNJevuWpQ8Cs1CWgfy4LkiRxts356CbMdgrTWHjBW) |
| **Atomic Threat Report (ThreatVerified + ThreatReported)** | [`DK1QdKDfegJtJPp3cKQGYtPkq6xpxDAFGeWW5kTUBS5H`](https://suiscan.xyz/testnet/tx/DK1QdKDfegJtJPp3cKQGYtPkq6xpxDAFGeWW5kTUBS5H) |

**Production Enclave**
- Endpoint: `http://98.82.186.207:3000`
- Public Key: `ac465f655403fdf57e7426f61ba49ec3ceda0ad4d844848f25f391472d6da915`
- PCR0/PCR1: `19e088b0fdbc7b4e0931a4daa900269310c500aa1fff82ae866fda102dc45475a9aeb7130cdb0a3c6dd25000143be358`
- PCR2: `21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c10edb30948c90ba67310f7b964fc500a`

---

## Security Guarantees

✅ **Sovereign Execution**: Core threat analysis runs inside an isolated AWS Nitro Enclave — no external API dependencies.  
✅ **Zero Private Key Exposure**: Analyzes unsigned bytes only.  
✅ **Hardware-Grade Access Control**: Proprietary agent config encrypted under PCR-based Seal policies — inaccessible outside the approved enclave.  
✅ **Gasless Reporting**: Sponsored Transactions and zkLogin enable frictionless community reporting at zero user cost.  
✅ **Cryptographic Attestation**: Every automated threat registration is signed by the registered enclave keypair and verified on-chain before registry commitment.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

Built to secure the Sui ecosystem. For wallet integration, enterprise API tiers, or B2B inquiries:

**Founder**: Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)  
**Platform**: [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
