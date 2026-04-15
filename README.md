# VibeGuard AI

**Real-Time Transaction Security & Decentralized Threat Intelligence for the Sui Ecosystem**

VibeGuard AI is a full-stack threat intelligence infrastructure designed to eliminate blind signing. By combining live blockchain simulation, deterministic Move static analysis, agentic AI, an event-driven on-chain reputation registry, a Seal-protected execution layer, and a Nautilus-verified compute pipeline, VibeGuard protects users from honeypot attacks and phishing exploits before a signature is ever broadcast — and automatically registers every detected threat on-chain with cryptographic attestation, creating a real-time security feed for the entire ecosystem to consume.

**[Live Platform](https://vibeguardai.vercel.app)** | **[Developer API Docs](https://vibeguardai.vercel.app/api-docs)** | **[Threat Intelligence Portal](https://vibeguardai.vercel.app/report)** | **[B2B Dashboard](https://vibeguardai.vercel.app/dashboard)**

---

## The Blind Signing Problem

The current Web3 user experience forces users to sign cryptographic payloads they do not understand. This opacity creates a massive attack vector:

- **Catastrophic Asset Drain:** Unexpected token, NFT, or permission transfers.
- **Honeypot Exploits:** Malicious contracts disguised as standard airdrops or mints.
- **Ecosystem Churn:** Security breaches permanently damage user trust and halt network adoption.

---

## Architecture

VibeGuard AI operates as a **Verified AI Consumer Product** with multi-layered protection:

1. **Deterministic Reputation Engine:** Instantly short-circuits execution if malicious `package_id`s are detected via the on-chain registry.
2. **Offline Static Analysis:** Parses Base64 transaction bytes client-side to extract Move calls, gas budgets, and targets without RPC overhead.
3. **Live State Simulation:** Leverages Sui's native `dryRunTransactionBlock` to execute the transaction against live network state and map precise asset flows.
4. **Intent-Mismatch Detection:** Compares the simulated outcome against the user's stated intent. If a user expects to receive assets but the simulation shows assets leaving, the transaction is flagged as a honeypot.
5. **Agentic AI Translation:** Translates complex Move object mutations into plain-English risk reports via Google Gemini.
6. **Automated Threat Registration:** When a `RED` risk transaction is detected, the pipeline silently registers the malicious package on-chain via a gasless Sponsored Transaction.

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

---

## Sui Stack

```
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
```

| Layer | Role | Without It |
|---|---|---|
| **Sui** | Decentralized consensus on threat state | B2B consumers can't trust the feed |
| **Walrus** | Immutable off-chain evidence storage | Single point of failure |
| **Nautilus** | Cryptographic proof of analysis integrity | Malicious reports poison registry |
| **Seal** | API key encrypted under PCR policy | Unauthorized usage, cost attacks |
| **zkLogin** | OAuth-based wallet abstraction | Friction kills community reporting |
| **Sponsored TX** | Gasless execution | Economic barrier to reporting |

---

## Seal Access Control

The Gemini API key is encrypted under a Seal policy tied to the approved Nautilus enclave's PCR measurements. Only the enclave whose PCR values match the registered policy can decrypt and use the key.

| # | Requirement | Implementation |
|---|---|---|
| 1 | Protected secret encrypted under a policy | `scripts/seal-setup.ts` encrypts the Gemini API key under PCR-based Seal policy ID `0x00` |
| 2 | Approved enclave environment registered | `seal_enclave::register_enclave()` stores PCRs and Ed25519 public key in `EnclaveConfig` on-chain |
| 3 | Only approved enclave can decrypt | Seal key servers verify PCR measurements before returning key shares |
| 4 | Enclave returns a signed output | Enclave keypair signs the threat payload before submission |
| 5 | Application verifies output on-chain | `seal_enclave::verify_and_report()` verifies Ed25519 signature before emitting `ThreatVerified` |

**Live Proof:** [`Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6)

---

## Developer Integration

### TypeScript SDK

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

// Analyze a transaction
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

**Frontend:** Next.js 14, TypeScript, Tailwind CSS  
**Blockchain Data:** @mysten/sui, Sui RPC  
**Smart Contracts:** Sui Move (`reputation_registry`, `seal_enclave`)  
**Decentralized Storage:** Walrus Protocol  
**Access Control:** Seal (PCR-based policy)  
**Transaction Sponsorship:** Sponsored Transactions  
**Identity Abstraction:** zkLogin + Ephemeral Ed25519 Keypairs  
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
| Enclave Registration | [`HGomNmBW...fPap`](https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap) |
| Nautilus E2E (`ThreatVerified: true`) | [`AxxRAbkn...s1DD`](https://suiscan.xyz/testnet/tx/AxxRAbkn2vVKSusxPSv1ECkbjHZgrErVEWh15hxVs1DD) |
| Seal Proof (`ThreatVerified` + `ThreatReported`) | [`Ht5iycN1...J3u6`](https://suiscan.xyz/testnet/tx/Ht5iycN1votME8r39f4gMxrTptTeaHGi3SVizLvUJ3u6) |
| Community Report (gasless) | [`57hge1tQ...uh7R`](https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R) |

---

## Security Guarantees

✅ **Zero Private Key Exposure:** Analyzes unsigned bytes only.  
✅ **Stateless Architecture:** No user transaction data is permanently stored off-chain.  
✅ **Registered Enclave Signer:** Every automated threat registration is signed by the enclave keypair registered in `EnclaveConfig` on-chain.  
✅ **Seal-Protected Secrets:** The Gemini API key is encrypted under a PCR-based Seal policy — inaccessible outside the approved enclave execution path.  
✅ **Rate Limited APIs:** All public endpoints are rate limited to prevent abuse.  
✅ **Strict Validation:** Input sanitization and Chain ID validation prevent replay attacks.

---

## Future Enhancements

### MemWal Integration (Walrus Agent Memory)

VibeGuard is evaluating integration with [MemWal](https://docs.walrus.site/), Walrus's first-party SDK for equipping AI agents with persistent memory. This would enable:

- **Persistent Threat Context:** Track evolving attack patterns from the same `package_id` across sessions
- **Behavioral Profiling:** Build historical threat profiles ("flagged 47 times in 3 days")
- **Context-Aware AI Analysis:** Enhance Gemini with historical threat data for more accurate intent-mismatch detection
- **Pattern Clustering:** Identify coordinated attacks from related deployer addresses
- **Reduced Indexer Latency:** Hot cache of recent threats for faster B2B API responses

**Cost:** $0 incremental (uses existing Walrus storage infrastructure)  
**Status:** Post-MVP enhancement — current stateless architecture meets all production requirements

---

## Contributing

We welcome contributions from security researchers and Sui developers. Open a [GitHub Issue](https://github.com/mianohh/vibeguard-ai/issues) or submit a pull request.

---

## License

MIT License — see the [LICENSE](LICENSE) file for details.

---

**Securing the Sui ecosystem with cryptographically verifiable threat intelligence.**

- **Founder:** Alex Miano | [LinkedIn](https://www.linkedin.com/in/alex-miano-2085832a3/) | [Telegram](https://t.me/miano369)
- **Platform:** [vibeguardai.vercel.app](https://vibeguardai.vercel.app)
- **Documentation:** [API Docs](https://vibeguardai.vercel.app/api-docs) | [Threat Portal](https://vibeguardai.vercel.app/report)
