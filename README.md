# VibeGuard AI

**Real-Time Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

VibeGuard AI is a full-stack threat intelligence infrastructure designed to eliminate blind signing. By combining live blockchain simulation, deterministic Move static analysis, a sovereign local threat agent, an event-driven on-chain reputation registry, a Seal-protected execution layer, and a Nautilus-verified compute pipeline, VibeGuard protects users from honeypot attacks and phishing exploits before a signature is ever broadcast. It automatically registers every detected threat on-chain with cryptographic attestation, creating a real-time, trustless security feed for the entire ecosystem to consume.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)** | **[B2B Dashboard](https://vibeguardai.vercel.app/dashboard)**

---

## The Blind Signing Problem

The current Web3 user experience forces users to sign cryptographic payloads they do not understand. This opacity creates a massive attack vector:

- **Catastrophic Asset Drain**: Unexpected token, NFT, or permission transfers.
- **Honeypot Exploits**: Malicious contracts disguised as standard airdrops or mints.
- **Ecosystem Churn**: Security breaches permanently damage user trust and halt network adoption.

---

## Sovereign Architecture

VibeGuard AI operates as a **Decentralized Security Primitive** with multi-layered, zero-dependency protection:

1. **Deterministic Reputation Engine**: Instantly short-circuits execution if malicious package_ids are detected via the on-chain registry.
2. **Offline Static Analysis**: Parses Base64 transaction bytes client-side to extract Move calls, gas budgets, and targets without RPC overhead.
3. **Live State Simulation**: Leverages Sui's native `dryRunTransactionBlock` to execute the transaction against live network state and map precise asset flows.
4. **Intent-Mismatch Detection**: Compares the simulated outcome against the user's stated intent. If a user expects to receive assets but the simulation shows assets leaving, the transaction is flagged.
5. **Sovereign Threat Analysis**: The **LocalThreatAgent**—a deterministic, pattern-based threat detection engine—analyzes asset flows, permission changes, and transaction complexity entirely locally, completely eliminating centralized Web2 API dependencies.
6. **Automated Threat Registration**: When a RED risk transaction is detected, the pipeline silently registers the malicious package on-chain via a gasless Sponsored Transaction.

```
USER SUBMITS TRANSACTION BYTES
        ↓
[OFFLINE ANALYSIS] Parse Base64 → Extract Move calls
        ↓
[REPUTATION CHECK] Query on-chain registry for known threats
        ↓
[LIVE SIMULATION] dryRunTransactionBlock → Map asset flows
        ↓
[THREAT ANALYSIS] LocalThreatAgent → Intent mismatch & pattern detection
        ↓
[RISK CLASSIFICATION] GREEN / YELLOW / RED
        ↓
IF RED → [AUTO-REPORT PIPELINE]
        ↓
[NAUTILUS SIGNING] Enclave keypair signs threat payload internally
        ↓
[WALRUS UPLOAD] Evidence JSON → Immutable blob storage
        ↓
[ATOMIC TX] verify_and_report + report_malicious_contract
        ↓
[ON-CHAIN REGISTRY] ThreatVerified + ThreatReported events
        ↓
[B2B FEED] Wallets/dApps subscribe to threat events
```

---

## Sui Stack Dependency Map

```
[ User Entry Layer ]
  ↳ zkLogin & Sponsored Transactions (Frictionless, gasless onboarding)
       ↓
[ Nautilus Verified Compute ]
  ↳ LocalThreatAgent executes entirely inside a Trusted Execution Environment (TEE).
  ↳ Enclave keypair signs the threat payload for verifiable off-chain compute.
       ↓
[ Sui On-Chain Core ]
  ↳ ReputationRegistry + SealEnclave Move Contracts.
  ↳ Verifies Ed25519 signature and enforces PCR trust conditions.
       ↙                             ↘
[ Off-Chain Storage ]           [ Access Control ]
  ↳ Walrus                        ↳ Seal
  ↳ Stores rich threat            ↳ Protects proprietary agent configurations 
    evidence as JSON blobs.         under PCR-based policies.
```

| Layer | Role | Consequence Without It |
|-------|------|------------------------|
| **Sui** | Decentralized consensus on threat state | B2B consumers can't trust the feed |
| **Walrus** | Immutable off-chain evidence storage | Single point of failure & state bloat |
| **Nautilus** | Cryptographic proof of analysis integrity | Malicious actors could forge reports & poison registry |
| **Seal** | Proprietary logic encrypted under PCR policy | Unauthorized extraction of proprietary threat models |
| **zkLogin** | OAuth-based wallet abstraction | Friction kills community reporting |
| **Sponsored TX** | Gasless execution | Economic barrier to reporting |

---

## Seal Access Control & Proprietary Logic

VibeGuard implements hardware-grade access control using Sui's **Seal protocol** (Pattern 4 — Secure Input Layer for Verified Compute).

Because VibeGuard AI relies on a sovereign **LocalThreatAgent** rather than centralized Web2 APIs, the Seal infrastructure is utilized to protect the **proprietary configuration weights and heuristic scoring rules** of the agent. This ensures that the proprietary logic cannot be extracted or tampered with outside of the approved, verifiable Nautilus execution path.

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Protected secret encrypted under a policy | `scripts/seal-setup.ts` encrypts the Agent Configuration under a PCR-based Seal policy ID `0x00` |
| 2 | Approved enclave environment registered | `seal_enclave::register_enclave()` stores PCRs and Ed25519 public key in `EnclaveConfig` on-chain |
| 3 | Only approved enclave can decrypt | Seal key servers verify PCR measurements before returning decryption key shares |
| 4 | Enclave returns a signed output | Enclave keypair signs the deterministic threat payload before submission |
| 5 | Application verifies output on-chain | `seal_enclave::verify_and_report()` verifies the Ed25519 signature before emitting `ThreatVerified` |

**Live Proof**: [Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6)

---

## Developer Integration

### TypeScript SDK

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

// Analyze a transaction locally
const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'mainnet',
  userAddress: '0xYourUserAddress',
  userIntent: 'Claim airdrop',
  onThreatDetected: (result) => {
    console.error('🚨 HONEYPOT DETECTED:', result.explanation.headline);
  }
});

// Query threat intelligence
const { threats } = await guard.queryThreats({ category: 'Honeypot' });
const { stats } = await guard.getThreatStats();

// Real-time threat stream
const unsubscribe = guard.subscribeToThreats((threat) => {
  blacklist.add(threat.malicious_package_id);
});

// Platform analytics
const analytics = await guard.getAnalytics();
const blobHealth = await guard.getBlobHealth();
```

### REST API

```bash
# Analyze a transaction
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -d '{"transactionBytes": "AAACAA...", "network": "mainnet", "userAddress": "0x...", "userIntent": "Claim airdrop"}'

# Query indexed threats
curl "https://vibeguardai.vercel.app/api/threats"
curl "https://vibeguardai.vercel.app/api/threats?category=Honeypot&severity=High"
curl "https://vibeguardai.vercel.app/api/threats?stats=true"

# Real-time threat stream (SSE)
curl "https://vibeguardai.vercel.app/api/events"

# Register webhook
curl -X POST https://vibeguardai.vercel.app/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.com/webhook", "events": ["ThreatReported"], "apiKey": "your_key"}'
```

---

## Technical Infrastructure

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain Data**: @mysten/sui, Sui RPC
- **Smart Contracts**: Sui Move (reputation_registry, seal_enclave)
- **Decentralized Storage**: Walrus Protocol
- **Access Control**: Seal (PCR-based policy protecting Agent configs)
- **Transaction Sponsorship**: Sponsored Transactions
- **Identity Abstraction**: zkLogin + Ephemeral Ed25519 Keypairs
- **Threat Analysis**: LocalThreatAgent (Sovereign pattern detection)

---

## Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| **ReputationRegistry Package** | [`0xa706a721...b494de`](https://suiscan.xyz/testnet/object/0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de) |
| **ReputationRegistry Object** | [`0xf172e861...495be`](https://suiscan.xyz/testnet/object/0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be) |
| **SealEnclave Package** | [`0x75f9626c...19fdc`](https://suiscan.xyz/testnet/object/0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc) |
| **EnclaveConfig Object** | [`0x2ca9a5fe...c502`](https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502) |

---

## Live Proof Transactions

| Event | Transaction |
|-------|-------------|
| **Enclave Registration** | [`HGomNmBW...fPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap) |
| **Nautilus E2E (ThreatVerified: true)** | [`AxxRAbkn...s1DD`](https://suiscan.xyz/testnet/tx/AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD) |
| **Seal Proof (ThreatVerified + ThreatReported)** | [`Ht5iycN1...J3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6) |
| **Community Report (gasless)** | [`57hge1tQ...uh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R) |

---

## Security Guarantees

✅ **Sovereign Execution**: Zero reliance on centralized Web2 APIs ensuring absolute uptime.  
✅ **Zero Private Key Exposure**: Analyzes unsigned bytes only.  
✅ **Stateless Architecture**: No user transaction data is permanently stored off-chain.  
✅ **Registered Enclave Signer**: Every automated threat registration is signed by the enclave keypair registered in `EnclaveConfig` on-chain.  
✅ **Seal-Protected Infrastructure**: Proprietary threat-scoring configurations are cryptographically locked to approved TEEs via PCR policies.  
✅ **Strict Validation**: Input sanitization and Chain ID validation prevent replay attacks.

---

## Future Enhancements

### On-Device Enclave LLM Inference

For enhanced natural language explanations while maintaining zero external dependencies, future iterations will integrate **Llama 3.2 1B** directly into the Nautilus TEE via `llama.cpp`. This allows for robust LLM analysis that is still fully verifiable and cost-free.

### MemWal Integration (Walrus Agent Memory)

Integration with **MemWal** for persistent threat context:

- **Persistent Threat Context**: Track evolving attack patterns across sessions
- **Behavioral Profiling**: Build historical threat profiles
- **Pattern Clustering**: Identify coordinated attacks

---

## Contributing

We welcome contributions from security researchers and Sui developers. Open a GitHub Issue or submit a pull request.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

**Securing the Sui ecosystem with sovereign, cryptographically verifiable threat intelligence.**

**Founder**: Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)  
**Platform**: [vibeguardai.vercel.app](https://vibeguardai.vercel.app)  
**Documentation**: [API Docs](https://vibeguardai.vercel.app/api-docs) | [Threat Portal](https://vibeguardai.vercel.app/report)
