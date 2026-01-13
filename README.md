# VibeGuard AI

*The First Line of Defense for Your Sui Assets*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Sui SDK](https://img.shields.io/badge/Sui-SDK-4DA6FF?style=flat-square)](https://docs.sui.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Project Overview

**The Problem:** Raw blockchain transaction digests are cryptographic hashes—completely unreadable to humans. Users are forced to "blind sign" transactions without understanding what they're actually approving.

**The Solution:** VibeGuard AI transforms these incomprehensible digests into instant, visual risk assessments. Our rule-based analysis engine parses Sui transaction data and delivers human-readable security insights in real-time.

*Demystifying Sui Transactions with Human-Readable Risk Analysis.*

---

## Key Features

🔍 **Smart Input Detection**  
Auto-detects transaction digests instantly—no manual configuration required.

🛡️ **Three-Tier Risk Engine**  
- **SAFE (Green Shield):** Normal operations, standard logging, gas-only transactions
- **CAUTION (Yellow Triangle):** Asset swaps/trades requiring user review  
- **DANGER (Red Skull):** Assets leaving wallet without compensation—potential security threat

⚡ **Real-Time Analysis**  
Direct blockchain state lookups using `@mysten/sui` SDK for instant transaction parsing.

📱 **Responsive Cyber-UI**  
Dark, high-tech interface optimized for all devices with custom cyberpunk aesthetics.

🔒 **Zero External Dependencies**  
Rule-based analysis engine requires no third-party APIs—complete privacy and reliability.

---

## Technical Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React, TypeScript |
| **Styling** | TailwindCSS with custom cyberpunk theme |
| **Blockchain** | Sui TypeScript SDK (@mysten/sui) |
| **Backend Logic** | Server-side API route (`/api/analyze`) |
| **Analysis Engine** | Rule-based transaction risk assessment |

---

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/mianohh/vibeguard-ai.git
cd vibeguard-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the Application
Open [http://localhost:3000](http://localhost:3000) to access the VibeGuard AI interface.

---

## API Usage

### Endpoint
```
POST /api/analyze
```

### Request Format
```json
{
  "digest": "YOUR_TRANSACTION_DIGEST_HERE"
}
```

### Example Request
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"digest": "tgJndGrUxor7t7cxkYMHN5xxYAZTocz9fzQKgUtDZ3P"}'
```

### Response Format
```json
{
  "success": true,
  "analysis": {
    "summary": "You are interacting with a contract. No assets are leaving your wallet besides a small gas fee",
    "riskScore": "SAFE",
    "reasoning": "Standard contract interaction with only gas payment"
  },
  "transactionData": {
    "balanceChanges": [...],
    "objectChanges": [...],
    "effects": {...}
  }
}
```

---

## Roadmap

### Coming Soon
- 🤖 **AI Agent Integration:** Advanced pattern recognition using machine learning models
- 📊 **Historical Risk Patterning:** Track and analyze transaction patterns over time
- 🌐 **Multi-Chain Support:** Expand beyond Sui to other blockchain networks
- 🔌 **Browser Extension:** Seamless wallet integration for real-time protection
- 📱 **Mobile Application:** On-the-go transaction security analysis

---

## Contributing

We welcome contributions to VibeGuard AI! Here's how to get started:

1. **Fork the repository** and clone your fork
2. **Install dependencies:** `npm install`
3. **Create a feature branch:** `git checkout -b feature/your-feature-name`
4. **Make your changes** and test locally
5. **Submit a pull request** with a clear description

### Areas for Contribution
- Security analysis improvements
- UI/UX enhancements  
- Documentation updates
- Performance optimizations

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for the future of Web3 security** 🛡️