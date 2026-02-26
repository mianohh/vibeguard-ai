# 🔐 VibeGuard AI

**Eliminate blind signing on Sui blockchain**

VibeGuard AI is a security tool that analyzes Sui transactions before you sign them. It uses live blockchain simulation, intent-based scam detection, and AI explanations to protect you from honeypot attacks and phishing scams.

![Security Grade](https://img.shields.io/badge/Security-MVP%20Ready-green)
![Network](https://img.shields.io/badge/Sui-Mainnet%20%7C%20Testnet%20%7C%20Devnet-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Scam Detection](https://img.shields.io/badge/Scam%20Detection-Intent%20Based-red)

## 🚨 The Problem: Blind Signing

Blind signing is when you approve a blockchain transaction without understanding what it will do. This leads to:

- **Asset Loss**: Unexpected token or NFT transfers
- **Honeypot Scams**: Fake "airdrops" that drain your wallet
- **Permission Exploits**: Unwanted access to your assets
- **Irreversible Damage**: Blockchain transactions cannot be undone

## ⚡ How VibeGuard Works

1. **Input Flexibility**: Paste base64 transaction bytes from your wallet (before signing)
2. **Blacklist Check**: Instantly blocks known malicious contracts
3. **Static Analysis**: Locally parses Move calls, gas budget, transfers, and chain ID
4. **Intent Capture**: Describe what you think the transaction does
5. **Live Simulation**: Uses Sui's `dryRunTransactionBlock` to see what actually happens
6. **Intent Mismatch Detection**: Compares expectation vs. reality
7. **AI Analysis**: Explains risks in plain English (8th-grade reading level)
8. **Risk Verdict**: Green (Safe) / Yellow (Caution) / Red (Danger)

## 🎯 Example: Scam Detection

### Without Intent (Limited Protection)
```
Transaction: Sends 100 SUI to unknown address
VibeGuard: "⚠️ Assets leave your wallet"
User: "Maybe that's just how airdrops work?" ❌ Signs anyway
```

### With Intent (Full Protection)
```
Transaction: Sends 100 SUI to unknown address
User Intent: "Claim free airdrop"
VibeGuard: "🚨 SCAM DETECTED - You expect to receive assets, 
            but this transaction sends 100 SUI away. 
            Real airdrops NEVER ask you to send assets first."
User: ✅ Does not sign
```

## ✨ Features

- 📦 **TypeScript SDK** - Drop-in npm package for easy integration
- 📊 **Live Impact Dashboard** - Real-time stats showing scans, value protected, and scams blocked
- 🚫 **Contract Blacklist** - Blocks known malicious contracts before simulation
- 🔍 **Static Analysis** - Parse Move calls, gas budget, and transfers without RPC
- 🎯 **Intent Mismatch Detection** - Compare what you expect vs. what actually happens
- 🤖 **AI Explanations** - Plain English analysis at 8th-grade reading level
- 🛡️ **Multi-Layer Protection** - Combines static parsing, simulation, and AI analysis
- 🌐 **Multi-Network** - Supports Mainnet, Testnet, and Devnet
- 🔓 **Freemium API** - Free tier for testing, paid tiers for production

## 🚀 Quick Start

### For Developers: Use the SDK

```bash
npm install vibeguard-sui-security
```

```typescript
import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...', // Base64 from your wallet
  network: 'testnet',
  userAddress: '0x1234...',
  userIntent: 'Claim airdrop'
});

if (result.risk.riskLevel === 'RED') {
  console.log('DANGER:', result.explanation.plainEnglish);
  // Block transaction
} else {
  console.log('Safe to proceed');
}
```

**With API Key (Production):**
```typescript
const guard = new VibeGuard({ apiKey: 'your-api-key' });
```

### For Web App Development

```bash
git clone https://github.com/mianohh/vibeguard-ai
cd vibeguard-ai
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env and add your Gemini API key from https://ai.google.dev/
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Generate Test Transactions

```bash
# Get testnet SUI from https://faucet.testnet.sui.io/
node generate_test.js YOUR_TESTNET_ADDRESS

# Output:
# ✅ SAFE transaction (self-transfer)
#    Intent: "Send to myself" → Should show GREEN
# 🚨 DANGER transaction (transfer to stranger)
#    Intent: "Claim free airdrop" → Should show RED with scam warning
```

## 🔧 Integration Options

### 1. TypeScript SDK (Recommended)
Perfect for wallet developers and dApp integrations.

```bash
npm install vibeguard-sui-security
```

[View SDK Documentation](./packages/sdk/README.md)

### 2. Direct API Calls
For any language or platform.

```bash
curl -X POST https://vibeguardai.vercel.app/api/explain \
  -H "Content-Type: application/json" \
  -d '{"transactionBytes": "...", "network": "testnet"}'
```

[View API Documentation](https://vibeguardai.vercel.app/api-docs)

### 3. Web Interface
For manual transaction analysis.

[Try Live Demo](https://vibeguardai.vercel.app)

---

## 📡 API Endpoints

**For Developers:** Our public API is available for testing and hackathons without a key (rate limited). For production use and higher rate limits, please register for a Developer API Key.

Full API documentation: [/api-docs](https://vibeguardai.vercel.app/api-docs)

### POST /api/explain
Full analysis with AI explanation and scam detection. **Free tier available for testing.**

```json
{
  "transactionBytes": "AAACAA...",  // Base64 bytes BEFORE signing
  "network": "testnet",
  "userAddress": "0x..." // Required for intent mismatch detection
  "userIntent": "Claim airdrop" // Optional but recommended
}
```

**Response:**
```json
{
  "simulation": {
    "effectsSummary": {...},
    "staticAnalysis": {
      "moveCalls": [{"packageId": "0x2", "moduleName": "coin", "functionName": "transfer"}],
      "gasBudget": "10000000",
      "isHighGas": false,
      "containsDirectTransfer": true,
      "chainId": "4c78adac",
      "networkMismatch": false
    }
  },
  "risk": {
    "riskLevel": "RED",
    "reasons": ["⚠️ INTENT MISMATCH: You expect to receive assets, but this sends assets away"],
    "confidence": 0.9
  },
  "explanation": {
    "headline": "Honeypot Scam Detected",
    "plainEnglish": "This transaction will send 100 SUI from your wallet...",
    "recommendedAction": "Do Not Sign"
  }
}
```

## ⚖️ Risk Assessment Rules

### 🔴 RED (Danger)
- **Blacklisted contract**: Known malicious package detected
- Assets leave your wallet to another address
- **Intent mismatch**: You expect to receive but assets are leaving
- Transaction will fail if executed

### 🟡 YELLOW (Caution)
- Interaction with smart contracts
- Complex state changes
- High gas usage

### 🟢 GREEN (Safe)
- Self-transfers (assets stay with you)
- No assets leaving to other addresses
- No permission changes

## 🛠️ Tech Stack

- **Next.js 14**: React framework with API routes
- **@mysten/sui.js**: Official Sui SDK
- **Google Gemini API**: AI explanations
- **TypeScript**: Type safety
- **Tailwind CSS**: UI styling

## 🔒 Security & Privacy

- ✅ No private keys required
- ✅ No wallet connection needed
- ✅ No data stored or logged
- ✅ Static analysis works offline
- ✅ Input validation & sanitization
- ✅ Chain ID validation prevents replay attacks
- ✅ Open API access (free tier for testing, paid for production)
- ✅ Server-side AI processing
- ✅ Open source & auditable

## 📋 Known Limitations

- Only works with base64 transaction bytes from your wallet BEFORE signing
- Transaction hashes from Sui Explorer cannot be simulated (already executed)
- Intent detection works best with keywords: claim, airdrop, free, mint, receive
- AI explanations may fall back to deterministic rules if API fails
- Does not auto-block dangerous transactions (user decision required)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Test with real Sui transactions
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

**Common Issues:**

- **"Hash lookup failed"**: Use base64 bytes from wallet BEFORE signing, not hashes from explorer
- **"Intent mismatch not detected"**: Include `userAddress` in API request and use keywords like "claim", "airdrop", "free", "mint"
- **"AI errors"**: Check your `GEMINI_API_KEY` is valid

## ⚠️ Disclaimer

VibeGuard AI is a security tool, not a guarantee. Always verify transactions independently. The blockchain is immutable - once signed, transactions cannot be reversed.

## 💡 Pro Tip

**Always fill in the intent field!** This activates scam detection and significantly improves protection against honeypot attacks.

---

**Built with ❤️ for the Sui community**

🔗 [Live Demo](https://vibeguardai.vercel.app) | [📡 API Docs](https://vibeguardai.vercel.app/api-docs) | [Report Issues](https://github.com/mianohh/vibeguard-ai/issues)
