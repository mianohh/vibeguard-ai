# VibeGuard AI

**Real-Time Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

VibeGuard AI is a full-stack threat intelligence infrastructure designed to eliminate blind signing. By combining live blockchain simulation, deterministic Move static analysis, agentic AI, and an event-driven on-chain reputation registry, VibeGuard protects users from honeypot attacks and phishing exploits before a signature is ever broadcast. Furthermore, it automatically registers every detected threat on-chain, creating a real-time security feed for the entire ecosystem to consume.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)**

---

## The Blind Signing Problem

The current Web3 user experience forces users to sign cryptographic payloads they do not understand. This opacity creates a massive attack vector resulting in:

- **Catastrophic Asset Drain:** Unexpected token, NFT, or permission transfers.
- **Honeypot Exploits:** Malicious contracts disguised as standard airdrops or mints.
- **Ecosystem Churn:** Security breaches permanently damage user trust and halt network adoption.

---

## Full-Stack Architecture

VibeGuard AI operates as a **Verified AI Consumer Product**, designed with a clear separation between trusted on-chain state, off-chain rich data, and low-friction user entry. It offers **Multi-Layered Protection**:

1. **Deterministic Reputation Engine:** Instantly short-circuits execution if malicious `package_id`s are detected via our on-chain registry.
2. **Offline Static Analysis:** Parses Base64 transaction bytes client-side to extract Move calls, gas budgets, and targets without relying on RPC overhead.
3. **Live State Simulation:** Leverages Sui's native `dryRunTransactionBlock` to execute the transaction against the live network state and map precise asset flows.
4. **Intent-Mismatch Detection:** Compares the simulated outcome against the user's stated intent (e.g., "Claim Airdrop"). If a user expects to receive assets, but the simulation shows assets leaving, the transaction is flagged as a honeypot.
5. **Agentic AI Translation:** Translates complex Move object mutations into plain-English risk reports via Google Gemini.
6. **Automated Threat Registration:** When a `RED` risk transaction is detected, the pipeline silently and automatically registers the malicious package on-chain via a gasless Sponsored Transaction — no manual reporting required.

---

## Automated Detection Pipeline

Every transaction analyzed through VibeGuard that is classified as a `RED` risk triggers a silent, background reporting flow. The user receives their risk warning instantly, while the on-chain registration happens asynchronously without blocking the response.

```text
User submits transaction bytes
        ↓
Analysis detects RED risk (honeypot / intent mismatch)
        ↓
Auto-reporter fires asynchronously (non-blocking)
        ↓
1. Ephemeral system burner keypair generated (single-use)
2. Evidence JSON uploaded to Walrus decentralized storage → blob_id
3. Sponsored Transaction built (gas paid by VibeGuard sponsor wallet)
4. Burner signs + executes on-chain
        ↓
ThreatReported event emitted on Sui Testnet
ReputationRegistry updated with malicious package + Walrus blob_id
```

**Live Proof — Recent Automated Registrations on Sui Testnet:**

| Tx Digest | Malicious Target | Reporter (Ephemeral Burner) |
|---|---|---|
| `EvP6hCLTg6Ku...` | `0x8d8bc4a2...` | `0xb8a203...` (single-use) |
| `6XeD5yUzktgu...` | `0x0000...0bad` | `0x230c2d...` (single-use) |
| `8GrYjmTe7Pyx...` | `0x0000...0bad` | `0x81804a...` (single-use) |

**Live Registry:** [ReputationRegistry on Sui Testnet](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be)

---

## Decentralized Threat Intelligence

Security must be accessible to everyone. VibeGuard integrates deep Sui primitives to remove technical barriers and establish a core security primitive for the ecosystem:

- **Walrus Decentralized Storage:** All threat reports (both automated and community-submitted) are stored immutably on Walrus with cryptographic Blob IDs, ensuring censorship-resistant evidence preservation.
- **On-Chain Move Registry:** Verified threats are committed to a decentralized `ReputationRegistry` Move smart contract with Walrus blob references. The contract emits `ThreatReported` events, creating an immutable, indexable, real-time security signal feed that B2B wallet providers and dApps can subscribe to.
- **Gasless Community Reporting:** Users can report malicious contracts manually with zero gas costs via Sponsored Transactions.
- **Gasless Automated Reporting:** The detection pipeline utilizes Ephemeral Burner Wallets and Sponsored Transactions to register threats without maintaining persistent system keys or requiring human intervention.

### 🔗 Decentralized Storage Architecture (Walrus + Sui)

VibeGuard AI implements a strict, fully-linked off-chain storage pattern to ensure that our threat intelligence feed is both rich in data and cryptographically verifiable on-chain:

1. **Structured Threat Intelligence:** Threat evidence is not treated as a raw file dump. Before decentralized storage, the backend wraps the AI reasoning in a standardized JSON metadata object (containing `title`, `publisher`, `category`, and `timestamp`). This ensures all off-chain data is highly structured and indexable by our B2B partners.
2. **Immutable Cryptographic Linkage:** Upon successful Walrus upload, our infrastructure captures both the Walrus `blobId` and the corresponding Sui-native `blob_object_id` (the Blob NFT representation on the Sui network).
3. **Verifiable Smart Contract State:** Our `ReputationRegistry` Move smart contract enforces this relationship natively. The `ThreatRecord` struct and the B2B `ThreatReported` event both permanently bind the on-chain registry entry to the off-chain Walrus Blob NFT. This guarantees a trustless, unbreakable link between the lightweight on-chain security signal and the heavy off-chain rich data.

---

## Sui Stack Dependency Map

```text
User
  ↓
[User Entry Layer] Ephemeral Burner Wallets & Sponsored Transactions (Low-friction onboarding)
  ↓
[Sui On-Chain Core] ReputationRegistry Move Contract (Trusted state, permissions, and event emissions)
  ↙                          ↘
[Off-Chain Data]         [Verified Compute]
Walrus (Stores rich      Nautilus (🚧 Planned Phase 3:
AI threat evidence       AWS Nitro Enclave for trustless
JSON files)              heuristic threat scoring)
  ↓
Final Product Outcome: Gasless, instant threat protection and an immutable B2B security feed.
```

---

## Developer Integration

VibeGuard AI is built for drop-in integration by wallet providers and dApp developers looking to protect their users.

### TypeScript SDK

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard({ apiKey: process.env.VIBEGUARD_API_KEY });

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...', // Raw Base64 from wallet provider
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop'
});

if (result.risk.riskLevel === 'RED') {
  console.error('🚨 HONEYPOT DETECTED:', result.explanation.plainEnglish);
}
```

### REST API

```bash
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
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
**Smart Contracts:** Sui Move (`reputation_registry`)  
**Decentralized Storage:** Walrus Protocol (`/v1/blobs`)  
**Transaction Sponsorship:** Sponsored Transactions (gasless execution for users and the automated pipeline)  
**Identity Abstraction:** Ephemeral Ed25519 Keypairs  
**AI Processing:** Google Gemini API

### Deployed Contracts (Testnet)

| Contract | Address |
|---|---|
| Package | `0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de` |
| ReputationRegistry | `0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be` |

---

## Security Guarantees

✅ **Zero Private Key Exposure:** Analyzes unsigned bytes only.  
✅ **Stateless Architecture:** No user transaction data is permanently stored off-chain.  
✅ **Ephemeral Auto-Reporters:** Each automated threat registration uses a single-use keypair — no persistent system keys are held on the server.  
✅ **Strict Validation:** Input sanitization and Chain ID validation prevent replay attacks.

---

## Roadmap

### ✅ Phase 1: MVP (Completed)
- Offline static analysis & Base64 parsing.
- Live RPC simulation integration.
- AI-driven intent mismatch detection.
- NPM SDK publication.

### ✅ Phase 2: Decentralized Threat Feed (Completed)
- **Walrus Integration:** Threat reports stored on Walrus. Both `blobId` and `blob_object_id` (Blob NFT) are captured and committed on-chain, establishing a fully-linked off-chain storage pattern.
- **On-Chain Registry:** `ReputationRegistry` Move contract deployed with `ThreatRecord` struct binding each registry entry to its Walrus Blob NFT. Contract emits `ThreatReported` events with full blob linkage.
- **Automated Detection Pipeline:** `RED` risk transactions are automatically registered on-chain via Ephemeral Burner Wallets and Sponsored Transactions — no manual reporting required.
- **zkLogin Community Reporting:** Users report malicious contracts gaslessly via Google OAuth-backed zkLogin burner wallets. Live proof: [`57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R).

### 🚧 Phase 3: Distribution & Validation (Current Focus)
- **B2B Onboarding:** Securing pilot partnerships with Sui ecosystem wallet providers to subscribe to `ThreatReported` events as an indexable security signal feed.
- **SDK Adoption Tracking:** Measuring real-world API usage, TVP (Total Value Protected), and community feedback.
- **Mainnet Deployment:** Migrating the `ReputationRegistry` contract and automated pipeline to Sui Mainnet.
- **Nautilus Verified Compute Integration:** Migrating our off-chain AI threat-scoring logic from centralized Web2 APIs to a trustless AWS Nitro Enclave using Nautilus, ensuring all risk verdicts are cryptographically attested before on-chain registration.

---

## Contributing

We welcome contributions from security researchers and Sui developers. For guidelines on updating the threat registry or expanding SDK language support, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues).

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

**Built to secure the Sui ecosystem.** For enterprise API keys or partnership inquiries, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues) or reach out directly.

[vibeguardai.vercel.app](https://vibeguardai.vercel.app)
