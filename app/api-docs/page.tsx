'use client';

export default function ApiDocs() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            📡 API Documentation
          </h1>
          <p className="text-slate-400">
            Integrate VibeGuard AI into your application
          </p>
        </div>

        {/* Base URL */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Base URL</h2>
          <code className="text-blue-400 bg-slate-900 px-3 py-2 rounded">
            https://vibeguardai.vercel.app
          </code>
        </div>

        {/* Authentication */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Authentication</h2>
          <p className="text-slate-300 mb-4">
            Include your API key in the request header:
          </p>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`x-api-key: your_api_key_here`}
            </code>
          </pre>
          <p className="text-slate-400 text-sm mt-4">
            Contact the team to request an API key for production use.
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
  "transactionBytes": "base64_or_0x_hash",
  "network": "testnet",
  "userAddress": "0x...",
  "userIntent": "Claim airdrop"
}`}
            </code>
          </pre>

          <h3 className="text-lg font-semibold text-slate-200 mb-3 mt-6">Response</h3>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`{
  "risk": {
    "riskLevel": "RED",
    "reasons": ["⚠️ INTENT MISMATCH"],
    "confidence": 0.9
  },
  "explanation": {
    "headline": "Honeypot Scam Detected",
    "plainEnglish": "This transaction will...",
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
  -H "x-api-key: your_api_key_here" \\
  -d '{
    "transactionBytes": "AAACAA...",
    "network": "testnet",
    "userIntent": "Claim airdrop"
  }'`}
            </code>
          </pre>
        </div>

        {/* Example: JavaScript */}
        <div className="security-surface p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Example: JavaScript</h2>
          <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300">
{`const response = await fetch('https://vibeguardai.vercel.app/api/explain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_api_key_here'
  },
  body: JSON.stringify({
    transactionBytes: 'AAACAA...',
    network: 'testnet',
    userIntent: 'Claim airdrop'
  })
});

const data = await response.json();
console.log(data.risk.riskLevel);`}
            </code>
          </pre>
        </div>

        {/* Support */}
        <div className="security-surface p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Support</h2>
          <p className="text-slate-300 mb-4">
            Need help or want to request an API key?
          </p>
          <a 
            href="https://github.com/mianohh/vibeguard-ai/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Open GitHub Issue
          </a>
        </div>

      </div>
    </div>
  );
}
