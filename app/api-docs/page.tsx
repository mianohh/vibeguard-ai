'use client';

export default function ApiDocs() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            📡 Developer Documentation
          </h1>
          <p className="text-slate-400">
            Integrate VibeGuard AI into your Sui wallet or dApp
          </p>
        </div>

        {/* TypeScript SDK */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">📦 TypeScript SDK (Recommended)</h2>
          <p className="text-slate-300 mb-4">
            The easiest way to integrate VibeGuard into your Sui wallet or dApp.
          </p>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto mb-4">
            <code className="text-sm text-slate-300">
{`npm install vibeguard-sui-security`}
            </code>
          </pre>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'testnet',
  userAddress: '0x1234...',
  userIntent: 'Claim airdrop'
});

if (result.risk.riskLevel === 'RED') {
  // Block transaction
}`}
            </code>
          </pre>
          <a 
            href="https://www.npmjs.com/package/vibeguard-sui-security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            View on npm →
          </a>
        </div>

        {/* Base URL */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">🌐 Direct API Access</h2>
          <p className="text-slate-300 mb-3">Base URL</p>
          <code className="text-blue-400 bg-slate-900 px-3 py-2 rounded">
            https://vibeguardai.vercel.app
          </code>
        </div>

        {/* Authentication */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">🔓 Freemium API</h2>
          <p className="text-slate-300 mb-4">
            <strong>Free tier available for testing and hackathons</strong> - no API key required!
          </p>
          <p className="text-slate-400 text-sm">
            For production use and higher rate limits, contact us for a Developer API Key.
          </p>
        </div>

        {/* Endpoint */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            POST /api/explain
          </h2>
          <p className="text-slate-300 mb-4">
            Full transaction analysis with AI explanation and scam detection.
          </p>

          <h3 className="text-lg font-semibold text-slate-200 mb-3 mt-6">Request Body</h3>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`{
  "transactionBytes": "AAACAA...",  // Base64 bytes BEFORE signing
  "network": "testnet",
  "userAddress": "0x...",
  "userIntent": "Claim airdrop"  // Optional but recommended
}`}
            </code>
          </pre>
          <p className="text-yellow-400 text-sm mt-3">
            ⚠️ Use base64 transaction bytes from your wallet BEFORE signing. Transaction hashes from explorers won't work.
          </p>

          <h3 className="text-lg font-semibold text-slate-200 mb-3 mt-6">Response</h3>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`{
  "simulation": {
    "effectsSummary": {...},
    "staticAnalysis": {
      "moveCalls": [...],
      "gasBudget": "10000000",
      "containsDirectTransfer": true
    }
  },
  "risk": {
    "riskLevel": "RED",
    "reasons": [
      "Assets leave your wallet to another address",
      "⚠️ INTENT MISMATCH: You expect to receive assets, but this sends assets away"
    ],
    "confidence": 0.9
  },
  "explanation": {
    "headline": "Honeypot Scam Detected",
    "plainEnglish": "This transaction will send 100 SUI from your wallet...",
    "recommendedAction": "Do Not Sign"
  }
}`}
            </code>
          </pre>
        </div>

        {/* Example: cURL */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Example: cURL</h2>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`curl -X POST https://vibeguardai.vercel.app/api/explain \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionBytes": "AAACAA...base64...",
    "network": "testnet",
    "userAddress": "0x1234...5678",
    "userIntent": "Claim free airdrop"
  }'`}
            </code>
          </pre>
          <p className="text-slate-400 text-sm mt-3">
            Replace with your actual base64 transaction bytes and wallet address.
          </p>
        </div>

        {/* Example: JavaScript */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Example: JavaScript</h2>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`const response = await fetch('https://vibeguardai.vercel.app/api/explain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transactionBytes: 'AAACAA...base64...',
    network: 'testnet',
    userAddress: '0x1234...5678',
    userIntent: 'Claim free airdrop'
  })
});

const data = await response.json();
console.log(data.risk.riskLevel);
console.log(data.explanation.recommendedAction);`}
            </code>
          </pre>
        </div>

        {/* Support */}
        <div className="security-surface p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">🆘 Need Help?</h2>
          <p className="text-slate-300 mb-4">
            Questions about integration or found a bug?
          </p>
          <div className="flex gap-4">
            <a 
              href="https://github.com/mianohh/vibeguard-ai/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              GitHub Issues
            </a>
            <a 
              href="https://www.npmjs.com/package/vibeguard-sui-security"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              View on npm
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
