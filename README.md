# VibeGuard AI

**Real-Time Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

VibeGuard AI is a full-stack threat intelligence infrastructure designed to eliminate blind signing. By combining live blockchain simulation, deterministic Move static analysis, agentic AI, an event-driven on-chain reputation registry, a Seal-protected execution layer, and a Nautilus-simulated verified compute pipeline, VibeGuard protects users from honeypot attacks and phishing exploits before a signature is ever broadcast — and automatically registers every detected threat on-chain with cryptographic attestation, creating a real-time security feed for the entire ecosystem to consume.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)**

---

## The Blind Signing Problem

The current Web3 user experience forces users to sign cryptographic payloads they do not understand. This opacity creates a massive attack vector:

- **Catastrophic Asset Drain:** Unexpected token, NFT, or permission transfers.
- **Honeypot Exploits:** Malicious contracts disguised as standard airdrops or mints.
- **Ecosystem Churn:** Security breaches permanently damage user trust and halt network adoption.

---

## Full-Stack Architecture

VibeGuard AI operates as a **Verified AI Consumer Product**, designed with a clear separation between trusted on-chain state, off-chain rich data, and low-friction user entry. It offers **Multi-Layered Protection**:

1. **Deterministic Reputation Engine:** Instantly short-circuits execution if malicious `package_id`s are detected via the on-chain registry.
2. **Offline Static Analysis:** Parses Base64 transaction bytes client-side to extract Move calls, gas budgets, and targets without RPC overhead.
3. **Live State Simulation:** Leverages Sui's native `dryRunTransactionBlock` to execute the transaction against live network state and map precise asset flows.
4. **Intent-Mismatch Detection:** Compares the simulated outcome against the user's stated intent. If a user expects to receive assets but the simulation shows assets leaving, the transaction is flagged as a honeypot.
5. **Agentic AI Translation:** Translates complex Move object mutations into plain-English risk reports via Google Gemini.
6. **Automated Threat Registration:** When a `RED` risk transaction is detected, the pipeline silently registers the malicious package on-chain via a gasless Sponsored Transaction — no manual reporting required.

---

## Sui Stack Dependency Map

```
SUI STACK DEPENDENCY MAP

[ User Entry Layer ] 
  ↳ zkLogin & Sponsored Transactions (Frictionless, gasless onboarding)
       ↓
[ Nautilus Verified Compute ]
  ↳ Gemini AI executes intent analysis inside a Trusted Execution Environment (TEE).
  ↳ Enclave keypair signs the threat payload.
       ↓
[ Sui On-Chain Core ]
  ↳ ReputationRegistry + SealEnclave Move Contracts.
  ↳ Verifies Ed25519 signature and enforces PCR trust conditions.
       ↙                             ↘
[ Off-Chain Storage ]           [ Access Control ]
  ↳ Walrus                        ↳ Seal
  ↳ Stores rich AI threat         ↳ Protects AI API keys under 
    evidence as JSON blobs.         PCR-based policies.
       ↓
FINAL OUTCOME: Cryptographically attested threat protection and an immutable B2B security feed.
```

---

## Automated Detection Pipeline

Every transaction classified as `RED` risk triggers a silent background reporting flow. The user receives their risk warning instantly while on-chain registration completes asynchronously.

```text
User submits transaction bytes
        ↓
Analysis detects RED risk (honeypot / intent mismatch)
        ↓
Auto-reporter fires
        ↓
1. Registered enclave keypair loaded (public key matches EnclaveConfig on-chain)
2. Evidence JSON uploaded to Walrus → blob_id + blob_object_id captured
3. Payload signed with registered enclave Ed25519 keypair (raw signature, no prefix)
   Message = malicious_package_id bytes + walrus_blob_id bytes + timestamp_ms LE64
4. Sponsored Transaction built — two Move calls in one atomic transaction:
   a. seal_enclave::verify_and_report  → verifies Ed25519 sig against EnclaveConfig
                                         public key, emits ThreatVerified { verified: true }
   b. registry::report_malicious_contract → commits blob_id on-chain, emits ThreatReported
        ↓
Both events emitted on Sui Testnet
ReputationRegistry updated with malicious package + Walrus blob_id
ThreatVerified.verified = true — cryptographic proof of enclave participation
```

**Live Registry:** [ReputationRegistry on Sui Testnet](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be)

---

## Seal Access Control Integration

VibeGuard implements **Pattern 4 — Secure Input Layer for Verified Compute** from the Sui Seal Access Control module.

### What is Protected

The Gemini API key is the protected secret. Rather than storing it as a plain environment variable accessible to any server process, the architecture encrypts it under a Seal policy tied to the approved Nautilus enclave's PCR measurements. Only the enclave whose PCR values match the registered policy can decrypt and use the key.

### The Five Verifiable Proof Points

| # | Requirement | Implementation |
|---|---|---|
| 1 | A protected secret was encrypted under a policy | `scripts/seal-setup.ts` encrypts the Gemini API key under a PCR-based Seal policy with ID `0x00` |
| 2 | An approved enclave environment was registered | `seal_enclave::register_enclave()` stores PCRs and Ed25519 public key in the `EnclaveConfig` shared object on-chain |
| 3 | Only the approved enclave could decrypt and use the secret | Seal key servers verify PCR measurements before returning key shares — decryption is denied if PCRs do not match |
| 4 | The enclave returned a signed output | The enclave keypair signs the threat payload (`malicious_package_id` bytes + `walrus_blob_id` bytes + `timestamp_ms`) before submission |
| 5 | The application verified that output through trusted logic | `seal_enclave::verify_and_report()` reconstructs the message and verifies the Ed25519 signature on-chain before emitting `ThreatVerified` |

**Live Proof Transaction:** [`Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6)

This transaction executes two Move calls atomically:

1. `seal_enclave::enclave::verify_and_report` — verifies the enclave signature and emits `ThreatVerified`
2. `reputation_registry::registry::report_malicious_contract` — commits the Walrus blob reference and emits `ThreatReported`

Both events share the same Walrus Blob ID, establishing a cryptographic link between the on-chain security signal and the off-chain threat evidence.

### ThreatVerified Event (on-chain)

```json
{
  "enclave_signer": "0x87c185ea2e73d001bf790d713bb47856f638d6cad1a2645516437f965a725002",
  "malicious_package_id": "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  "verified": true,
  "walrus_blob_id": "EKezFTkg5V4G_QMcM2GWGb-L97piNQ693-pjFszv5B4",
  "timestamp_ms": 1775034737084
}
```

`verified: true` — the registered enclave keypair's Ed25519 signature was verified on-chain against the `enclave_public_key` stored in `EnclaveConfig`. This is the live proof of the full Nautilus verified compute pipeline running on Sui Testnet.

### Seal Policy Setup

`scripts/seal-setup.ts` defines the PCR-based Seal policy and encrypts the Gemini API key:

```typescript
const sealPolicy = {
  pcrs: [PCR0, PCR1, PCR2], // enclave image, kernel, and application measurements
  keyId: '0x00'             // fixed ID per the Seal–Nautilus documented pattern
};

const encryptedSecret = await sealClient.encrypt({
  threshold: 2,
  packageId: ENCLAVE_CONFIG_OBJECT_ID,
  id: Buffer.from('00', 'hex'),
  data: new TextEncoder().encode(geminiApiKey),
});
```

The encrypted output is safe to store publicly — it cannot be decrypted outside the approved enclave execution path.

---

## Decentralized Threat Intelligence

VibeGuard integrates deep Sui primitives to remove technical barriers and establish a core security primitive for the ecosystem:

- **Walrus Decentralized Storage:** All threat reports are stored immutably on Walrus with cryptographic Blob IDs. Both the `blobId` and the Sui-native `blob_object_id` (Blob NFT) are captured and committed on-chain, establishing a fully-linked off-chain storage pattern.
- **On-Chain Move Registry:** Verified threats are committed to the `ReputationRegistry` Move contract. The contract emits `ThreatReported` events, creating an immutable, indexable, real-time security signal feed that B2B wallet providers and dApps can subscribe to.
- **Gasless Automated Reporting:** The detection pipeline uses Ephemeral Burner Wallets and Sponsored Transactions to register threats without persistent system keys or human intervention.
- **Gasless Community Reporting:** Users can report malicious contracts manually with zero gas costs via Sponsored Transactions.

---

## Developer Integration

### TypeScript SDK

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
  userIntent: 'Claim airdrop',
  onThreatDetected: (result) => {
    console.error('🚨 HONEYPOT DETECTED:', result.explanation.headline);
  }
});

if (result.risk.riskLevel === 'RED') {
  // Block the transaction
}
```

### REST API

```bash
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBytes": "AAACAA...",
    "network": "mainnet",
    "userAddress": "0x...",
    "userIntent": "Claim airdrop"
  }'
```

---

## Technical Infrastructure

**Frontend:** Next.js 14, TypeScript, Tailwind CSS  
**Blockchain Data:** @mysten/sui, Sui RPC  
**Smart Contracts:** Sui Move (`reputation_registry`, `seal_enclave`)  
**Decentralized Storage:** Walrus Protocol (`/v1/blobs`)  
**Access Control:** Seal (PCR-based policy, encrypted secret provisioning)  
**Transaction Sponsorship:** Sponsored Transactions (gasless execution)  
**Identity Abstraction:** Ephemeral Ed25519 Keypairs  
**AI Processing:** Google Gemini API

### Deployed Contracts (Testnet)

| Contract | Address |
|---|---|
| ReputationRegistry Package | [`0xa706a721...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| ReputationRegistry Object | [`0xf172e861...495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| SealEnclave Package | [`0x3727d247...2ff6`](https://suiscan.xyz/testnet/object/0x3727d2478d4622e276e183912f6939517603d05bf93d4e3f3f628cbccd7a2ff6) |
| EnclaveConfig Object | [`0x50c50306...5128`](https://suiscan.xyz/testnet/object/0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128) |

### Live Proof Transactions

| Event | Transaction |
|---|---|
| Enclave Registration (`EnclaveRegistered`) | [`HGomNmBW...fPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap) |
| Nautilus E2E (`ThreatVerified: true` + `ThreatReported`) | [`AxxRAbkn...s1DD`](https://suiscan.xyz/testnet/tx/AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD) |
| Seal Module 3 Proof (`ThreatVerified` + `ThreatReported`) | [`Ht5iycN1...J3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6) |

---

## Security Guarantees

✅ **Zero Private Key Exposure:** Analyzes unsigned bytes only.  
✅ **Stateless Architecture:** No user transaction data is permanently stored off-chain.  
✅ **Registered Enclave Signer:** Every automated threat registration is signed by the enclave keypair whose public key is registered in `EnclaveConfig` on-chain — verified cryptographically before registry commitment.  
✅ **Seal-Protected Secrets:** The Gemini API key is encrypted under a PCR-based Seal policy — inaccessible outside the approved enclave execution path.  
✅ **Strict Validation:** Input sanitization and Chain ID validation prevent replay attacks.

---

## Roadmap

### ✅ Phase 1: MVP (Completed)
- Offline static analysis & Base64 parsing.
- Live RPC simulation integration.
- AI-driven intent mismatch detection.
- NPM SDK publication.

### ✅ Phase 2: Decentralized Threat Feed (Completed)
- **Walrus Integration:** Threat reports stored on Walrus. Both `blobId` and `blob_object_id` captured and committed on-chain.
- **On-Chain Registry:** `ReputationRegistry` Move contract deployed, emitting `ThreatReported` events with full blob linkage.
- **Automated Detection Pipeline:** `RED` risk transactions automatically registered on-chain via Ephemeral Burner Wallets and Sponsored Transactions.
- **zkLogin Community Reporting:** Users report malicious contracts gaslessly via Google OAuth-backed zkLogin burner wallets. Live proof: [`57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R).

### ✅ Phase 3: Seal Access Control (Completed)
- **SealEnclave Contract:** `seal_enclave` Move package deployed to Sui Testnet with `EnclaveConfig` shared object, `register_enclave()` for PCR registration, and `verify_and_report()` for on-chain signature verification.
- **Seal Policy Setup:** `scripts/seal-setup.ts` encrypts the Gemini API key under a PCR-based Seal policy — inaccessible outside the approved enclave path.
- **Live Integration Proof:** Every `RED` risk detection executes two atomic Move calls — `verify_and_report` on `seal_enclave` followed by `report_malicious_contract` on `reputation_registry`. Live proof: [`Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6).

### ✅ Phase 4: Cryptographic Staging & Verified Compute (Completed)
- **Enclave Boot Sequence Simulation:** Validated the Nitro Enclave architecture in a staging environment, generating stable Ed25519 keypairs and registering deterministic PCR measurements (PCR0/1/2) on Sui Testnet. Registration tx: [`HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap).
- **EnclaveConfig Registration:** Successfully stored PCRs and public keys in the on-chain shared object (`is_registered = true`).
- **Atomic Pipeline Validation:** Enforced full Ed25519 signature verification against the registered enclave public key, emitting `ThreatVerified { verified: true }` in a fully serverless staging environment. E2E proof tx: [`AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD`](https://suiscan.xyz/testnet/tx/AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD).
- **Production Deployment:** Enclave private key stored as encrypted Vercel environment variable (`ENCLAVE_PRIVATE_KEY`) — no laptop dependency, fully serverless.
- **E2E Test Suite:** `scripts/nautilus-e2e-test.ts` validates the full 5-step pipeline end-to-end: on-chain state check → keypair match → Walrus upload → enclave signing → atomic tx execution → `verified: true` confirmation.

### 🚧 Phase 5: Mainnet & B2B (Next)
- **Mainnet Deployment:** Migrating both `ReputationRegistry` and `SealEnclave` contracts to Sui Mainnet.
- **Real Nitro Enclave:** Deploying to AWS Nitro Enclave with real PCR measurements via AWS Activate credits.
- **B2B Onboarding:** Securing pilot partnerships with Sui ecosystem wallet providers to subscribe to `ThreatReported` and `ThreatVerified` events as an indexable security signal feed.

---

## Contributing

We welcome contributions from security researchers and Sui developers. For guidelines on updating the threat registry or expanding SDK language support, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues).

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

**Built to secure the Sui ecosystem.**

For wallet integration support, enterprise B2B API tiers, or investment inquiries, please reach out directly:

- **LinkedIn:** [Alex Miano](https://www.linkedin.com/in/alex-miano-2085832a3/)
- **Telegram:** [@miano369](https://t.me/miano369)
- **Platform:** [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
