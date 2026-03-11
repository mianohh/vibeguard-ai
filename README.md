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

### 🎬 Live Demo

> **[Watch VibeGuard in Action →](https://vibeguardai.vercel.app)**  
> See real-time transaction analysis detecting honeypot scams before signature.

<!-- TODO: Add demo GIF here showing:
     1. User pastes transaction bytes
     2. VibeGuard analyzes in real-time
     3. RED alert appears with plain-English explanation
     Example: ![VibeGuard Demo](./assets/demo.gif)
-->

---

### 📊 Data Flow Architecture

```
┌─────────────────┐
│   Wallet dApp   │
│  (User Intent)  │
└────────┬────────┘
         │ Raw Transaction Bytes (Base64)
         ▼
┌─────────────────────────────────────────────────────────┐
│              VibeGuard Security Pipeline                │
├─────────────────────────────────────────────────────────┤
│  1. Reputation Check  →  Blacklist Registry (Move)     │
│  2. Static Analysis   →  Parse Move Calls & Gas        │
│  3. Live Simulation   →  Sui RPC dryRunTransaction     │
│  4. Intent Matching   →  Compare Expected vs Actual    │
│  5. AI Translation    →  Gemini Plain-English Report   │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Risk Verdict & Recommendation              │
├─────────────────────────────────────────────────────────┤
│  🟢 GREEN:    Safe to sign                             │
│  🟡 YELLOW:   Review carefully                          │
│  🔴 RED:      DO NOT SIGN - Intent mismatch detected   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  User Decision  │
│  (Sign/Reject)  │
└─────────────────┘
```

**Key Insight:** VibeGuard intercepts transactions *before* signing, providing a security layer that wallets can integrate with a single API call.

---

## 🌍 Decentralized Threat Intelligence (Move + zkLogin + Walrus)

Security must be accessible to everyone, not just power users. To protect underdeveloped communities and onboard the next billion users safely, VibeGuard integrates deep Sui primitives to remove technical barriers:

- **Frictionless Reporting via zkLogin:** Users can report malicious contracts using standard OAuth (Google/Twitch). No seed phrases, no complex wallet setups.

- **Gasless Submissions:** Threat reports are powered by Sponsored Transactions, removing financial barriers to community participation.

- **Walrus Decentralized Storage:** All threat reports are stored immutably on Walrus, ensuring censorship-resistant evidence preservation with cryptographic blob IDs.

- **On-Chain Move Registry:** Verified threats are committed to a decentralized `ReputationRegistry` Move smart contract with Walrus blob references, creating an immutable, public good threat feed for the entire Sui ecosystem.

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
**Blockchain Data:** @mysten/sui.js, Sui RPC  
**Smart Contracts:** Sui Move (`reputation_registry`)  
**Decentralized Storage:** Walrus Protocol  
**Authentication:** @mysten/zklogin, Google OAuth  
**AI Processing:** Google Gemini API

---

## Security & Privacy Guarantees

✅ Zero private key exposure (analyzes unsigned bytes).  
✅ Stateless architecture (no user transaction data is stored).  
✅ Strict input sanitization and Chain ID validation to prevent replay attacks.

---

## 🗺️ Product Roadmap

Our engineering roadmap is strictly dictated by active user feedback, partner integrations, and measured Product-Market Fit. We prioritize shipping usable frameworks over theoretical technical layers.

### ✅ Phase 1: MVP Framework (Completed)
- Offline static analysis & Base64 parsing.
- Live RPC simulation integration.
- AI-driven intent mismatch detection.
- NPM SDK publication.

### 🚧 Phase 2: Distribution & Validation (Current Focus)
- **Walrus Integration:** Threat reports stored on Walrus decentralized storage with on-chain blob ID references.
- **zkLogin Reporting:** Gasless, OAuth-based threat submission pipeline live on testnet.
- **B2B Onboarding:** Securing pilot partnerships with Sui ecosystem wallet providers.
- **SDK Adoption Tracking:** Measuring real-world API usage, TVP (Total Value Protected), and community feedback.

### 📅 Phase 3: Product-Led Iteration (Planned)
- Feature expansion guided strictly by partner feedback and wallet integration requirements.
- Exploring one-click browser extensions based on end-user UX testing.

---

## 🤝 Contributing

We welcome contributions from security researchers and Sui developers. Please review our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on updating the threat registry or expanding SDK language support.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built to secure the Sui ecosystem.** For enterprise API keys or partnership inquiries, please open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues) or reach out directly.

🔗 [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
