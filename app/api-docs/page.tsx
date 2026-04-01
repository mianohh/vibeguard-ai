'use client';

export default function ApiDocs() {
  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-10 h-10 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <h1 className="text-4xl font-bold text-white">
              Developer Documentation
            </h1>
          </div>
          <p className="text-gray-400">
            Integrate VibeGuard AI into your Sui wallet or dApp
          </p>
        </div>

        {/* TypeScript SDK */}
        <div className="glass-card p-6 mb-8 liquid-expand">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-200">TypeScript SDK (Recommended)</h2>
          </div>
          <p className="text-gray-300 mb-4">
            The easiest way to integrate VibeGuard into your Sui wallet or dApp.
          </p>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto mb-4">
            <code className="text-sm text-gray-300">
{`npm install vibeguard-sui-security`}
            </code>
          </pre>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
{`import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

const result = await guard.analyzeTransaction({
  transactionBytes: 'AAACAA...',
  network: 'testnet',
  userAddress: '0x1234...',
  userIntent: 'Claim airdrop',
  onThreatDetected: (result) => {
    console.error('THREAT DETECTED:', result.explanation.headline);
  }
});

if (result.risk.riskLevel === 'RED') {
  // Block transaction
}`}
            </code>
          </pre>
          <h3 className="text-lg font-semibold text-gray-200 mb-3 mt-6">Retrieve Threat Report</h3>
          <p className="text-gray-400 text-sm mb-3">
            Fetch the full AI threat report from Walrus decentralized storage using a blob ID from a <code className="text-sui-cyan">ThreatReported</code> on-chain event.
          </p>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
{`// blobId from ThreatReported event, blobObjectId optional for liveness check
const report = await guard.retrieveThreatReport(
  'oNyrr0jEVATWSAGkJHnmoKVICnFosv1k4YNayZXcRgk',
  '0x08108c74...'
);

console.log(report.riskLevel);    // 'RED'
console.log(report.reasons);      // [...]
console.log(report.plainEnglish); // Full AI explanation`}
            </code>
          </pre>
          <a 
            href="https://www.npmjs.com/package/vibeguard-sui-security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sui-cyan hover:text-sui-aqua text-sm"
          >
            View on npm →
          </a>
        </div>

        {/* Base URL */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-200">Direct API Access</h2>
          </div>
          <p className="text-gray-300 mb-3">Base URL</p>
          <code className="text-sui-cyan bg-ocean-deepest px-3 py-2 rounded">
            https://vibeguardai.vercel.app
          </code>
        </div>

        {/* Authentication */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-status-safe" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-200">Authentication</h2>
          </div>
          <p className="text-gray-300 mb-4">
            The API is currently <strong className="text-status-safe">fully open — no API key required.</strong> All endpoints are accessible without authentication.
          </p>
          <p className="text-gray-400 text-sm">
            For enterprise access, rate limit increases, or partnership inquiries, open a <a href="https://github.com/mianohh/vibeguard-ai/issues" className="text-sui-cyan hover:text-sui-aqua">GitHub Issue</a>.
          </p>
        </div>

        {/* Endpoint */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            POST /api/explain
          </h2>
          <p className="text-gray-300 mb-4">
            Full transaction analysis with AI explanation and scam detection.
          </p>

          <h3 className="text-lg font-semibold text-gray-200 mb-3 mt-6">Request Body</h3>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
{`{
  "transactionBytes": "AAACAA...",  // Base64 bytes BEFORE signing
  "network": "testnet",
  "userAddress": "0x...",
  "userIntent": "Claim airdrop"  // Optional but recommended
}`}
            </code>
          </pre>
          <p className="text-status-warning text-sm mt-3">
            Use base64 transaction bytes from your wallet BEFORE signing. Transaction hashes from explorers won't work.
          </p>

          <h3 className="text-lg font-semibold text-gray-200 mb-3 mt-6">Response</h3>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
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
      "INTENT MISMATCH: You expect to receive assets, but this sends assets away"
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

        {/* Threat Retrieval Endpoint */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            GET /api/threat/[blobId]
          </h2>
          <p className="text-gray-300 mb-4">
            Retrieve a full threat report from Walrus decentralized storage. Accepts an optional <code className="text-sui-cyan">blobObjectId</code> query parameter to verify the Blob NFT is still live on Sui before fetching.
          </p>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
{`# Without liveness check
GET /api/threat/:blobId

# With Blob NFT liveness gate (returns 410 if expired)
GET /api/threat/:blobId?blobObjectId=0x...`}
            </code>
          </pre>
          <h3 className="text-lg font-semibold text-gray-200 mb-3 mt-6">Response</h3>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
{`{
  "metadata": {
    "title": "VibeGuard AI Threat Report",
    "publisher": "0x...",
    "category": "Security Signal",
    "timestamp": "2026-03-23T08:43:36.775Z"
  },
  "packageId": "0x...",
  "riskLevel": "RED",
  "headline": "Automated Detection: Honeypot/Malicious Contract",
  "reasons": [...],
  "reportedAt": "2026-03-23T08:43:36.775Z",
  "reportedBy": "vibeguard-automated-pipeline"
}`}
            </code>
          </pre>
        </div>

        {/* Example: cURL */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Example: cURL</h2>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
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
          <p className="text-gray-400 text-sm mt-3">
            Replace with your actual base64 transaction bytes and wallet address.
          </p>
        </div>

        {/* Example: JavaScript */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Example: JavaScript</h2>
          <pre className="bg-ocean-deepest p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-gray-300">
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
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-200">Need Help?</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Questions about integration or found a bug?
          </p>
          <div className="flex gap-4">
            <a 
              href="https://github.com/mianohh/vibeguard-ai/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              <span className="relative z-10">GitHub Issues</span>
            </a>
            <a 
              href="https://www.npmjs.com/package/vibeguard-sui-security"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card inline-block px-6 py-3 hover:border-sui-cyan transition-all"
            >
              <span className="text-gray-200 font-semibold">View on npm</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
