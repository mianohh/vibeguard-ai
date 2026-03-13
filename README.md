# 🔐 VibeGuard AI

**Enterprise-Grade Transaction Simulation & Intent Verification for the Sui Ecosystem**

VibeGuard AI is a decentralized security layer designed to eliminate blind signing. By combining live blockchain simulation, deterministic Move static analysis, and agentic AI, VibeGuard protects users from honeypot attacks, malicious state changes, and phishing exploits before a signature is ever broadcast.

🔗 **[Live Platform](https://vibeguardai.vercel.app)** | 📡 **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | 🚨 **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)**

---

## 🚨 Systemic Industry Risk: The Blind Signing Problem

The current Web3 user experience forces users to sign cryptographic payloads they do not understand. This opacity creates a massive attack vector resulting in:

- **Catastrophic Asset Drain:** Unexpected token, NFT, or permission transfers.
- **Honeypot Exploits:** Malicious contracts disguised as standard airdrops or mints.
- **Ecosystem Churn:** Security breaches permanently damage user trust and halt network adoption.

---

## ⚡ Core Architecture & Protection Matrix

VibeGuard AI operates as a middleware security pipeline, offering **Multi-Layered Protection**:

1. **Deterministic Reputation Engine:** Instantly short-circuits execution if malicious `package_id`s are detected via our on-chain registry.
2. **Offline Static Analysis:** Parses Base64 transaction bytes client-side to extract Move calls, gas budgets, and targets without relying on RPC overhead.
3. **Live State Simulation:** Leverages Sui's native `dryRunTransactionBlock` to execute the transaction against the live network state and map precise asset flows.
4. **Intent-Mismatch Detection:** Compares the simulated outcome against the user's stated intent (e.g., "Claim Airdrop"). If a user expects to receive assets, but the simulation shows assets leaving, the transaction is flagged as a honeypot.
5. **Agentic AI Translation:** Translates complex Move object mutations into an 8th-grade reading level, plain-English risk report.

---

## 🌍 Decentralized Threat Intelligence (zkLogin + Burner Wallets + Walrus)

Security must be accessible to everyone, not just power users. To protect underdeveloped communities and onboard the next billion users safely, VibeGuard integrates deep Sui primitives to remove all technical barriers:

- **Zero-Friction Authentication:** Users authenticate with Google OAuth via zkLogin, which deterministically generates consistent burner wallets for gasless transactions. No seed phrases, no wallet extensions, and no complex key management.
- **Persistent Identity with Gasless Execution:** Each Google account generates the same deterministic burner wallet across sessions, enabling consistent identity tracking while maintaining gasless transaction execution through sponsored transactions.
- **Walrus Decentralized Storage:** All threat reports are stored immutably on Walrus, ensuring censorship-resistant evidence preservation with cryptographic blob IDs.
- **On-Chain Move Registry:** Verified threats are committed to a decentralized `ReputationRegistry` Move smart contract with Walrus blob references. The contract emits `ThreatReported` events, creating an immutable, real-time threat feed for B2B wallet partners.

**🔗 Live Smart Contract:** [ReputationRegistry on Sui Testnet](https://suiscan.xyz/testnet/object/0x6d447256edfa7e8687eaf95324b5ac99a5969ecdaede1d6b3f8e27b14dca7ac3)

### Technical Implementation: zkLogin-Backed Burner Wallets

Our authentication system combines the best of both worlds:

1. **zkLogin Identity Layer:** Google OAuth + zkLogin proof generation creates a persistent Sui address tied to the user's Google account
2. **Deterministic Burner Generation:** The zkLogin address serves as a seed to generate a consistent Ed25519 burner wallet using `SHA-256(zkLoginAddress + 'burner_seed')`
3. **Sponsored Transaction Execution:** The burner wallet signs transactions while our backend sponsors gas costs, enabling truly gasless user experience
4. **Identity Persistence:** Same Google account always generates the same burner wallet, enabling consistent threat reporting attribution

This hybrid approach provides:
- ✅ **Persistent Identity:** Consistent addresses across sessions
- ✅ **Gasless Transactions:** No SUI tokens required
- ✅ **Zero Complexity:** Just Google OAuth, no wallet management
- ✅ **Decentralized Storage:** Immutable evidence on Walrus
- ✅ **On-Chain Registry:** Real-time threat feed via Move events

---

## 🚀 Developer Integration (DX)

VibeGuard AI is built for drop-in integration by wallet providers and dApp developers.

### 1. TypeScript SDK (Recommended for Wallets)

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

// Initialize with production API key
const guard = new VibeGuard({ apiKey: process.env.VIBEGUARD_API_KEY });

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...', // Raw Base64 from wallet provider
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop'
});

if (result.risk.riskLevel === 'RED') {
  // Intercept and alert the user
  console.error('🚨 INTENT MISMATCH DETECTED:', result.explanation.plainEnglish);
}
```

### 2. REST API Pipeline

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

## 🛠️ Technical Infrastructure

**Frontend:** Next.js 14, TypeScript, Tailwind CSS  
**Authentication:** zkLogin + Google OAuth, Deterministic Burner Wallets  
**Blockchain Data:** @mysten/sui, Sui RPC  
**Smart Contracts:** Sui Move (`reputation_registry`)  
**Decentralized Storage:** Walrus Protocol (`/v1/blobs`)  
**Transaction Sponsorship:** Multi-Sig Sponsored Transactions  
**AI Processing:** Google Gemini API

---

## Security & Privacy Guarantees

✅ **Zero private key exposure:** Analyzes unsigned bytes only.  
✅ **Stateless architecture:** No user transaction data is permanently stored off-chain.  
✅ **Strict validation:** Input sanitization and Chain ID validation to prevent replay attacks.

---

## 🗺️ Product Roadmap

Our engineering roadmap is strictly dictated by active user feedback, partner integrations, and measured Product-Market Fit. We prioritize shipping usable frameworks over theoretical technical layers.

### ✅ Phase 1: MVP Framework (Completed)
- Offline static analysis & Base64 parsing.
- Live RPC simulation integration.
- AI-driven intent mismatch detection.
- NPM SDK publication.

### ✅ Phase 2: Decentralized Threat Feed (Completed)
- **zkLogin Authentication:** Google OAuth integration with deterministic burner wallet generation for persistent identity.
- **Walrus Integration:** Threat reports stored on Walrus decentralized storage.
- **On-Chain Registry:** Smart contract deployed to index malicious packages alongside Walrus Blob IDs.
- **Gasless Reporting:** Sponsored transactions enable zero-cost threat submissions.

### 🚧 Phase 3: Distribution & Validation (Current Focus)
- **B2B Onboarding:** Securing pilot partnerships with Sui ecosystem wallet providers to subscribe to the `ThreatReported` events.
- **SDK Adoption Tracking:** Measuring real-world API usage, TVP (Total Value Protected), and community feedback.

---

## 🤝 Contributing

We welcome contributions from security researchers and Sui developers. For guidelines on updating the threat registry or expanding SDK language support, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues).

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built to secure the Sui ecosystem.** For enterprise API keys or partnership inquiries, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues) or reach out directly.

🔗 [vibeguardai.vercel.app](https://vibeguardai.vercel.app)