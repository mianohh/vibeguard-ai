# VibeGuard AI 🛡️

**The First Line of Defense for Sui Transactions**

VibeGuard AI is a cutting-edge Web3 security tool that eliminates blind signing by providing instant, human-readable transaction analysis for the Sui blockchain. Built with a dark, high-tech, cyberpunk-inspired interface designed for clarity and focus.

---

## 🚀 Core Features

### 🧠 **Smart Input Detection**
Automatically detects and processes both transaction digests and raw transaction blocks without manual configuration.

### 🎯 **Visual Risk Engine**
Our three-tier security assessment system provides instant visual feedback:

- 🛡️ **SAFE** (Green Shield): Normal operations, simple logging, gas-only transactions
- ⚠️ **CAUTION** (Yellow Triangle): Asset swaps and trades requiring user review
- 💀 **DANGER** (Red Skull): Assets leaving wallet without compensation - potential security threat

### 🔍 **Deep Dive Analysis**
Collapsible JSON views allow technical users to inspect:
- Raw transaction blocks
- Balance changes and effects
- Event logs and object modifications
- Gas usage and computation costs

### 📱 **Responsive Design**
Fully optimized cyberpunk interface that works seamlessly across desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14 (App Router), React, TypeScript |
| **Styling** | TailwindCSS with custom cyberpunk theme |
| **Blockchain** | @mysten/sui (Official Sui SDK) |
| **Backend** | Rule-based analysis engine (Zero external dependencies) |
| **Icons** | Lucide React (Modern, consistent iconography) |

---

## ⚡ Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/vibeguard-ai.git
cd vibeguard-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser to access the VibeGuard AI interface.

---

## 📡 API Documentation

### Endpoint
```
POST /api/analyze
```

### Request Format
```json
{
  "digest": "TRANSACTION_DIGEST_HASH"
}
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
    "effects": {...},
    "events": [...]
  }
}
```

### Example Usage
```bash
# Analyze a Sui transaction
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"digest": "tgJndGrUxor7t7cxkYMHN5xxYAZTocz9fzQKgUtDZ3P"}'
```

---

## 🏗️ Project Structure

```
vibeguard-ai/
├── src/
│   ├── app/
│   │   ├── api/analyze/          # Core analysis API route
│   │   ├── globals.css           # Tailwind CSS imports
│   │   ├── layout.tsx            # Root layout with dark theme
│   │   └── page.tsx              # Main VibeGuard interface
│   └── types/                    # TypeScript definitions
├── public/                       # Static assets
├── tailwind.config.js            # Custom styling configuration
└── package.json                  # Dependencies and scripts
```

The modular API architecture allows for future expansion into standalone oracle services and integration with other Web3 security tools.

---

## 🎨 Design Philosophy

VibeGuard AI embraces a **cyberpunk aesthetic** with:
- **Deep slate backgrounds** for reduced eye strain during extended use
- **High contrast typography** for maximum readability
- **Color-coded risk indicators** for instant threat assessment
- **Minimalist interface** that prioritizes critical security information

---

## 🔒 Security Features

- **Zero External Dependencies**: No third-party APIs required for core functionality
- **Client-Side Processing**: Transaction analysis happens locally for maximum privacy
- **Real-Time Analysis**: Instant feedback without network delays
- **Comprehensive Coverage**: Supports all Sui transaction types and patterns

---

## 📸 Project Screenshots

*Screenshots will be added here to showcase the interface and key features.*

---

## 🚀 Future Roadmap

- [ ] Browser extension for seamless wallet integration
- [ ] Advanced pattern recognition for emerging threat vectors
- [ ] Multi-chain support beyond Sui
- [ ] Community-driven threat intelligence feeds
- [ ] Mobile application for on-the-go security analysis

---

## 🤝 Contributing

VibeGuard AI is built for the Web3 community. Contributions, feature requests, and security improvements are welcome.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Sui ecosystem and Web3 security community.**