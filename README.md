# 🔐 VibeGuard AI

**Eliminate blind signing on Sui blockchain**

VibeGuard AI is a production-ready security tool that analyzes real Sui transactions before you sign them. It uses live blockchain simulation, deterministic risk analysis, and AI explanations to help you make informed decisions.

![Security Grade](https://img.shields.io/badge/Security-Production%20Ready-green)
![Network](https://img.shields.io/badge/Sui-Mainnet%20%7C%20Testnet%20%7C%20Devnet-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚨 What is Blind Signing?

Blind signing is when you approve a blockchain transaction without understanding what it will do. This is dangerous because:

- **Asset Loss**: You might lose tokens or NFTs unexpectedly
- **Permission Grants**: You could give unwanted access to your wallet
- **Hidden Actions**: Complex transactions can hide malicious operations
- **Irreversible**: Blockchain transactions cannot be undone

## ⚡ How VibeGuard Works

1. **Live Simulation**: Uses Sui's `dryRunTransactionBlock` to simulate your transaction on the real network
2. **Balance Analysis**: Detects exactly which assets move where
3. **Risk Assessment**: Applies deterministic rules to identify dangers
4. **AI Translation**: Converts technical data into plain English
5. **Clear Verdict**: Shows Green (Safe) / Yellow (Caution) / Red (Danger)

## 🛡️ Why VibeGuard is Trustworthy

- **Real Data Only**: No mock data, samples, or guesses - only live blockchain simulation
- **Deterministic Risk**: Risk assessment follows strict rules, not AI opinions  
- **Transparent Process**: Shows exactly what the transaction will do
- **Privacy First**: No wallet connection required, no data stored
- **Open Source**: All code is auditable and verifiable

## 🎯 Live Demo Results

### ✅ SAFE Transaction (Self-Transfer)
```
🛡️ SAFE - High confidence
✓ Self-transfer detected - assets remain in your control
✓ No assets leaving your wallet to other addresses
✓ No permission changes
```

### 🚨 DANGEROUS Transaction (Transfer to Others)
```
🚨 DANGEROUS - High confidence  
● Assets leave your wallet to another address
● Net asset loss detected
⚠️ Recommendation: Do Not Sign
```

## 🚀 Quick Start

### For End Users

1. **Get Transaction Bytes**:
   - Use any Sui wallet (Sui Wallet, Ethos, Martian, etc.)
   - Create a transaction but **DON'T sign it yet**
   - Copy the base64 transaction bytes from your wallet

2. **Analyze with VibeGuard**:
   - Go to [VibeGuard AI](https://vibeguardai.netlify.app)
   - Paste the transaction bytes
   - Add your wallet address (recommended for accuracy)
   - Select the correct network
   - Click "Analyze Transaction"

3. **Review Results**:
   - **Green**: Safe to sign
   - **Yellow**: Review carefully before signing  
   - **Red**: Do not sign unless absolutely certain

### For Developers

#### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vibeGuard_AI.git
cd vibeGuard_AI

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your Gemini API key
```

#### Environment Setup

```bash
# Required: Get a free Gemini API key from Google AI Studio
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom RPC endpoints
SUI_RPC_MAINNET=https://fullnode.mainnet.sui.io:443
SUI_RPC_TESTNET=https://fullnode.testnet.sui.io:443
SUI_RPC_DEVNET=https://fullnode.devnet.sui.io:443
```

#### Development

```bash
# Start development server
npm run dev

# Generate test transactions
npm run test <YOUR_SUI_ADDRESS>

# Build for production
npm run build
```

## 🧪 Testing with Real Transactions

VibeGuard includes a test generator that creates real Sui transactions:

```bash
# Generate SAFE and DANGER test transactions
node generate_test.js 0x1234...your_address...5678

# This outputs:
# ✅ SAFE transaction (self-transfer) 
# 🚨 DANGER transaction (transfer to stranger)
```

**Test Flow**:
1. Get testnet SUI from [Sui Faucet](https://faucet.testnet.sui.io/)
2. Run the test generator with your address
3. Copy each base64 string into VibeGuard
4. Verify SAFE shows Green, DANGER shows Red

## 📡 API Reference

### POST /api/simulate
Runs live dry-run simulation only.

```json
{
  "transactionBytes": "base64_encoded_transaction",
  "network": "testnet",
  "userAddress": "0x123...abc" // optional but recommended
}
```

### POST /api/analyze  
Runs simulation + risk analysis.

```json
{
  "simulation": { "rawDryRun": {...}, "effectsSummary": {...} },
  "risk": {
    "riskLevel": "GREEN|YELLOW|RED",
    "reasons": ["reason1", "reason2"],
    "confidence": 0.95
  }
}
```

### POST /api/explain
Full analysis with AI explanation.

```json
{
  "simulation": {...},
  "risk": {...},
  "explanation": {
    "headline": "What this transaction does",
    "plainEnglish": "Detailed explanation in simple terms",
    "bulletPoints": ["Key point 1", "Key point 2"],
    "recommendedAction": "Sign|Be Careful|Do Not Sign",
    "whatToCheck": ["Verification item 1", "Verification item 2"]
  }
}
```

## ⚖️ Risk Assessment Rules

### 🔴 RED (Danger)
- Assets leave your wallet to another address
- Net asset loss detected  
- Transaction will fail if executed
- Multiple transfers to unknown addresses

### 🟡 YELLOW (Caution)
- Interaction with smart contracts
- Complex state changes (>3 objects affected)
- High gas usage (>10M units)
- Object deletions or permission changes

### 🟢 GREEN (Safe)
- Self-transfers (assets stay with you)
- No assets leaving to other addresses
- Simple operations with low complexity
- No permission escalations

## 🌐 Deployment

### Vercel (Recommended)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Deploy VibeGuard AI"
git push origin main
```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Add `GEMINI_API_KEY` in environment variables
   - Deploy automatically

3. **Custom Domain** (Optional):
   - Add your domain in Vercel dashboard
   - Update DNS records as instructed

### Other Platforms

VibeGuard works on any Next.js hosting platform:
- **Netlify**: Add build command `npm run build`
- **Railway**: Auto-deploys from GitHub
- **DigitalOcean App Platform**: Use Node.js buildpack
- **AWS Amplify**: Connect GitHub repository

## 🔒 Security & Privacy

- **No Private Keys**: Never handles or requests private keys
- **No Wallet Connection**: No browser wallet integration required
- **Server-Side AI**: Gemini API calls happen server-side only
- **No Data Storage**: No transaction data is stored or logged
- **Open Source**: All code is publicly auditable

## 🛠️ Technical Architecture

```
Frontend (Next.js 14)
├── Security Console UI
├── Risk Status Display  
└── Transaction Input

Backend (API Routes)
├── Sui Simulator (Live dry-run)
├── Risk Engine (Deterministic rules)
└── Gemini Explainer (AI translation)

External Services
├── Sui RPC (Live blockchain data)
└── Google Gemini API (AI explanations)
```

### Key Technologies
- **Next.js 14**: React framework with API routes
- **@mysten/sui.js**: Official Sui SDK for blockchain interaction
- **@google/genai**: Gemini API for AI explanations
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Security-grade dark UI

## 📋 Known Limitations

- **Input Format**: Only accepts base64 transaction bytes from wallets
- **Network Dependency**: Requires live Sui RPC access
- **Complex Contracts**: May not understand all smart contract interactions
- **AI Explanations**: Falls back to deterministic explanations if Gemini fails
- **No Auto-Blocking**: Does not prevent you from signing dangerous transactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test with real Sui transactions
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- Test with real Sui transactions, never mock data
- Follow the existing TypeScript patterns
- Maintain security-first approach
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & FAQ

### Common Issues

**Q: "Analysis Failed - Invalid transaction format"**  
A: Ensure you copied the complete base64 transaction bytes from your wallet, not a transaction hash or partial data.

**Q: "Both SAFE and DANGER transactions show the same risk"**  
A: Make sure you're providing your wallet address in the "Your Address" field for accurate risk detection.

**Q: "Gemini API errors"**  
A: Check that your `GEMINI_API_KEY` is valid and has sufficient quota. The app will fall back to deterministic explanations.

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-username/vibeGuard_AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/vibeGuard_AI/discussions)
- **Security**: Email security@vibeguard.ai for security-related concerns

---

**⚠️ Important Disclaimer**: VibeGuard AI is a security tool, not a guarantee. Always verify transactions independently and never sign anything you don't fully understand. The blockchain is immutable - once signed, transactions cannot be reversed.

**🔗 Links**
- [Live Demo](https://vibeguardai.netlify.app)
- [Sui Documentation](https://docs.sui.io/)
- [Gemini API](https://ai.google.dev/)
- [Report Security Issues](mailto:security@vibeguard.ai)