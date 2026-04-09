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

VibeGuard implements hardware-grade access control using Sui's Seal protocol, encrypting sensitive credentials under PCR-based policies that enforce trusted execution environments.

### What is Protected

The Gemini API key is the protected secret. Rather than storing it as a plain environment variable accessible to any server process, the architecture encrypts it under a Seal policy tied to the approved Nautilus enclave's PCR measurements. Only the enclave whose PCR values match the registered policy can decrypt and use the key.

### Cryptographic Verification Chain

Every threat report undergoes five-step cryptographic validation:

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

## Product Roadmap

### ✅ Core Infrastructure (Live on Testnet)

**Transaction Analysis Engine**
- Offline static analysis with Base64 transaction parsing
- Live blockchain state simulation via `dryRunTransactionBlock`
- AI-powered intent mismatch detection
- TypeScript SDK published to NPM

**Decentralized Threat Intelligence Network**
- Walrus-backed immutable evidence storage with dual blob reference tracking (`blobId` + `blob_object_id`)
- On-chain `ReputationRegistry` Move contract emitting real-time `ThreatReported` events
- Automated threat registration pipeline using Sponsored Transactions
- Gasless community reporting via zkLogin (Google OAuth)
- Live proof: [`57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R)

**Verified Compute Architecture**
- `SealEnclave` Move contract with PCR-based enclave registration
- Seal-encrypted Gemini API key accessible only within approved execution environment
- On-chain Ed25519 signature verification via `verify_and_report()`
- Atomic dual-call transactions: signature verification + registry commitment
- Live proof: [`Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6)

**Cryptographic Attestation Pipeline**
- Enclave keypair generation and PCR measurement registration on-chain
- Registration tx: [`HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap)
- Full Ed25519 signature verification emitting `ThreatVerified { verified: true }`
- E2E proof: [`AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD`](https://suiscan.xyz/testnet/tx/AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD)
- Production-ready serverless deployment with encrypted environment variables

### 🚀 Next: Mainnet Launch & Enterprise Adoption

**Infrastructure Migration**
- Mainnet deployment of `ReputationRegistry` and `SealEnclave` contracts
- AWS Nitro Enclave production deployment with hardware-attested PCR measurements
- Multi-region redundancy and failover architecture

**B2B Go-to-Market**
- Pilot partnerships with Sui ecosystem wallet providers
- Real-time threat feed subscription API for dApps and security tools
- Enterprise SLA tiers with dedicated support
- White-label integration options for wallet providers

---

## Architecture Deep Dive

### End-to-End Transaction Security Flow

**User Action:** "Analyze Transaction Before Signing"

```
USER SUBMITS TRANSACTION BYTES
        ↓
[OFFLINE ANALYSIS] Parse Base64 → Extract Move calls
        ↓
[REPUTATION CHECK] Query on-chain registry for known threats
        ↓
[LIVE SIMULATION] dryRunTransactionBlock → Map asset flows
        ↓
[AI ANALYSIS] Gemini (Seal-protected) → Intent mismatch detection
        ↓
[RISK CLASSIFICATION] GREEN / YELLOW / RED
        ↓
IF RED → [AUTO-REPORT PIPELINE]
        ↓
[NAUTILUS SIGNING] Enclave keypair signs threat payload
        ↓
[WALRUS UPLOAD] Evidence JSON → Immutable blob storage
        ↓
[ATOMIC TX] verify_and_report + report_malicious_contract
        ↓
[ON-CHAIN REGISTRY] ThreatVerified + ThreatReported events
        ↓
[B2B FEED] Wallets/dApps subscribe to threat events
```

### Why Each Layer Exists

#### 1. Sui (Trusted State)
**What:** Malicious package registry + Enclave verification state  
**Why:** Decentralized consensus on threat data  
**Creates Need For:** Rich evidence storage (on-chain too expensive)

**On-Chain Objects:**
- `ReputationRegistry` — Stores package IDs + Walrus blob references
- `EnclaveConfig` — Stores PCR measurements + enclave public key
- Events: `ThreatReported`, `ThreatVerified`

#### 2. Walrus (Off-Chain Storage)
**What:** Immutable threat evidence JSON blobs  
**Why:** Full reports too expensive to store on-chain  
**Creates Need For:** Trusted analysis source (who generates reports?)

**Storage Pattern:**
- Upload evidence → Get `blobId` + `blob_object_id`
- Commit both references on-chain
- B2B consumers fetch full evidence from Walrus

**Live Example:** Blob `EKezFTkg5V4G_QMcM2GWGb-L97piNQ693-pjFszv5B4` linked in transaction [`Ht5iycN1...J3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6)

#### 3. Nautilus (Verified Compute)
**What:** AI threat analysis in AWS Nitro Enclave (TEE)  
**Why:** B2B consumers need cryptographic proof of analysis integrity  
**Creates Need For:** Protected AI API key (enclave needs Gemini)

**Verification Flow:**
1. Analysis runs in enclave
2. Enclave signs output with registered keypair
3. On-chain contract verifies Ed25519 signature
4. Emits `ThreatVerified { verified: true }`

**Live Proof:** Registration tx [`HGomNmBW...fPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap)

#### 4. Seal (Access Control)
**What:** Gemini API key encrypted under PCR-based policy  
**Why:** Prevent unauthorized API usage and cost attacks  
**Creates Need For:** User-friendly reporting (system is complex)

**Protection Mechanism:**
- API key encrypted with Seal policy
- Only enclave with matching PCRs can decrypt
- Key never exposed outside approved execution path

#### 5. zkLogin + Sponsored Transactions (Primitives)
**What:** OAuth-based wallet + gasless execution  
**Why:** Users shouldn't manage keys or pay gas to report threats  
**Completes The Loop:** Frictionless community reporting

**Live Proof:** Community report [`57hge1tQ...uh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R) — 0 SUI user cost

### What Breaks If You Remove Each Layer

| Remove | Consequence |
|--------|-------------|
| **Sui** | No consensus on threat state → B2B consumers can't trust the feed |
| **Walrus** | Evidence stored on centralized server → Single point of failure |
| **Nautilus** | No proof of analysis integrity → Malicious reports poison registry |
| **Seal** | API key exposed → Unauthorized usage, cost attacks |
| **zkLogin** | Users need private keys → Friction kills community reporting |
| **Sponsored TX** | Users pay gas → Economic barrier to reporting |

### Design Philosophy: Defense in Depth

VibeGuard's architecture is purpose-built for production security infrastructure:

**Layer Interdependency**
- Sui provides decentralized consensus → requires off-chain evidence storage
- Walrus provides immutable storage → requires trusted analysis source
- Nautilus provides verifiable compute → requires protected API credentials
- Seal provides access control → requires frictionless user entry
- zkLogin + Sponsored Transactions provide gasless UX → completes the security loop

**Architectural Integrity**
- Every component is load-bearing — removing any layer breaks the security guarantee
- The pipeline produces cryptographically verifiable, machine-consumable output
- B2B integrators can subscribe to real-time threat events with full provenance

**Production Deployment**
- Live platform: https://vibeguardai.vercel.app
- All transactions publicly auditable on Sui Testnet
- Open-source codebase: https://github.com/mianohh/vibeguard-ai

### B2B Integration Example

```typescript
// Wallet provider subscribes to threat feed
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

// Subscribe to ThreatReported events
client.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::registry::ThreatReported`
  },
  onMessage: async (event) => {
    const { malicious_package_id, walrus_blob_id } = event.parsedJson;
    
    // Fetch full evidence from Walrus
    const evidence = await fetch(
      `https://aggregator.walrus-testnet.walrus.space/v1/${walrus_blob_id}`
    );
    
    // Block transactions to this package
    blacklist.add(malicious_package_id);
  }
});
```

---

## Contributing

We welcome contributions from security researchers and Sui developers. For technical discussions on threat detection algorithms, registry architecture, or SDK expansion, open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues) or submit a pull request.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

**Securing the Sui ecosystem with cryptographically verifiable threat intelligence.**

For wallet integration partnerships, enterprise API access, or investment discussions:

- **Founder:** Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)
- **Platform:** [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
- **Documentation:** [API Docs](https://vibeguardai.vercel.app/api-docs) | [Threat Portal](https://vibeguardai.vercel.app/report)
