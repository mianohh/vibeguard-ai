import { Activity, Cpu, Info, Lock, Terminal, TriangleAlert } from 'lucide-react';
import SectionHeading from '@/app/components/ui/SectionHeading';
import CodeBlock from '@/app/components/ui/CodeBlock';
import { ButtonLink } from '@/app/components/ui/Button';

const sections = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'sdk', label: 'TypeScript SDK' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'explain', label: 'Explain' },
  { id: 'threat-intel', label: 'Threat Intel' },
  { id: 'threat-retrieval', label: 'Retrieval' },
  { id: 'examples', label: 'Examples' },
  { id: 'enclave', label: 'Enclave' },
  { id: 'engine', label: 'Threat Engine' },
  { id: 'support', label: 'Support' },
];

const threatFlags = [
  { flag: 'INTENT_MISMATCH_HONEYPOT', desc: 'User expects inflow but simulation shows outflow. Classic airdrop scam pattern.' },
  { flag: 'MULTI_RECIPIENT_DRAIN', desc: 'Assets routed to 3+ unique recipients. Multi-hop drain pattern.' },
  { flag: 'DRAIN_FUNCTION', desc: 'Dangerous Move functions: transfer_all, drain, sweep, approve_all, emergency_withdraw' },
  { flag: 'UNEXPECTED_OUTFLOW', desc: 'Unexpected asset outflow when user expects to receive' },
  { flag: 'HIGH_GAS_BUDGET', desc: 'Gas budget exceeds 500M MIST. Indicator of complex transaction.' },
];

const inlineCode = 'font-mono text-[12.5px] text-sui';

function EndpointHead({ method, path }: { method: 'GET' | 'POST'; path: string }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span
        className={`font-mono uppercase rounded-full px-2.5 py-1 text-[11px] ${
          method === 'GET'
            ? 'bg-safe-soft text-safe border border-safe-line'
            : 'bg-sui/10 text-sui border border-sui/35'
        }`}
      >
        {method}
      </span>
      <span className="font-mono text-[15px] font-semibold text-hi">{path}</span>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-2">{children}</p>;
}

export default function ApiDocs() {
  return (
    <div className="shell py-10 lg:py-14 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
        <SectionHeading
          kicker="Technical Reference"
          title="Ship a threat check in one call"
          lede="Analyze any unsigned Sui transaction and get back a risk level plus a plain-language explanation. No API key required."
        />
        <Terminal className="w-10 h-10 text-sui flex-shrink-0" strokeWidth={1.75} />
      </div>

      <nav aria-label="Sections" className="flex flex-wrap gap-2 mb-9">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-low border border-line rounded-full px-3 py-1.5 hover:text-hi hover:border-sui/40 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section id="quickstart" className="surface p-5 sm:p-7 mb-6 scroll-mt-24 animate-fade-up">
        <Kicker>Quickstart</Kicker>
        <h2 className="text-xl mb-1">Your first call</h2>
        <p className="text-mid text-sm mb-4">
          Copy, paste, run. Base URL: <code className={inlineCode}>https://vibeguardai.xyz</code>
        </p>
        <CodeBlock
          title="curl"
          className="mb-4"
          code={`curl -X POST https://vibeguardai.xyz/api/explain \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionBytes": "AAACAA...base64...",
    "network": "testnet",
    "userAddress": "0x1234...5678",
    "userIntent": "Claim free airdrop"
  }'`}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <ButtonLink href="/#analyze" size="md" className="shrink-0">
            Try the API
          </ButtonLink>
          <p className="text-mid text-sm">
            Runs against Sui <strong className="text-hi font-semibold">testnet</strong>. No key, no signup.
            replace the bytes with an unsigned transaction from your wallet.
          </p>
        </div>
      </section>

      <section id="sdk" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <div className="flex items-center gap-2.5 mb-2">
          <Cpu className="w-5 h-5 text-sui" strokeWidth={1.75} />
          <Kicker>TypeScript SDK</Kicker>
        </div>
        <h2 className="text-xl mb-2">Drop-in protection for wallets and dApps</h2>
        <p className="text-mid mb-4">
          The SDK wraps the same analysis the REST API returns, plus report retrieval from Walrus.
        </p>
        <CodeBlock title="bash" className="mb-4" code={`npm install vibeguard-sui-security`} />
        <CodeBlock
          title="typescript"
          code={`import { VibeGuard } from 'vibeguard-sui-security';

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
        />
        <h3 className="text-lg font-semibold mt-6 mb-2">Retrieve Threat Report</h3>
        <p className="text-mid text-sm mb-3">
          Fetch the signed threat report from Walrus decentralized storage using a blob ID from a{' '}
          <code className={inlineCode}>ThreatReported</code> on-chain event.
        </p>
        <CodeBlock
          title="typescript"
          code={`// blobId from ThreatReported event, blobObjectId optional for liveness check
const report = await guard.retrieveThreatReport(
  'oNyrr0jEVATWSAGkJHnmoKVICnFosv1k4YNayZXcRgk',
  '0x08108c74...'
);

console.log(report.riskLevel);    // 'RED'
console.log(report.reasons);      // [...]
console.log(report.plainEnglish); // human-readable explanation`}
        />
        <a
          href="https://www.npmjs.com/package/vibeguard-sui-security"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm text-sui hover:text-aqua transition-colors"
        >
          View on npm →
        </a>
      </section>

      <section id="authentication" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <div className="flex items-center gap-2.5 mb-2">
          <Lock className="w-5 h-5 text-safe" strokeWidth={1.75} />
          <Kicker>Security</Kicker>
        </div>
        <h2 className="text-lg lg:text-xl mb-3">Authentication</h2>
        <p className="text-mid mb-3">
          The API is currently{' '}
          <strong className="text-safe font-semibold">fully open, no API key required.</strong> All endpoints
          are accessible without authentication.
        </p>
        <p className="text-mid text-sm">
          For enterprise access, rate limit increases, or partnership inquiries, open a{' '}
          <a
            href="https://github.com/mianohh/vibeguard-ai/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sui hover:text-aqua underline underline-offset-2 transition-colors"
          >
            GitHub Issue
          </a>
          .
        </p>
      </section>

      <section id="explain" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <Kicker>Analysis Endpoint</Kicker>
        <EndpointHead method="POST" path="/api/explain" />
        <p className="text-mid mt-3 mb-4">Full transaction simulation, deterministic risk analysis, and plain-language explanation.</p>

        <h3 className="text-lg font-semibold mb-3 mt-6">Request Body</h3>
        <CodeBlock
          title="json"
          code={`{
  "transactionBytes": "AAACAA...",  // Base64 bytes BEFORE signing
  "network": "testnet",
  "userAddress": "0x...",
  "userIntent": "Claim airdrop"  // Optional but recommended
}`}
        />
        <div className="flex items-start gap-2.5 mt-3 border border-warn-line bg-warn-soft rounded-[var(--radius-ctl)] px-3.5 py-3">
          <TriangleAlert className="w-4 h-4 text-warn mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <p className="text-[13px] text-mid leading-relaxed">
            Use base64 transaction bytes from your wallet BEFORE signing. Transaction hashes from explorers
            won&apos;t work.
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-3 mt-6">Response</h3>
        <CodeBlock
          title="json"
          code={`{
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
        />
      </section>

      <section id="threat-intel" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <div className="flex items-center gap-2.5 mb-2">
          <Activity className="w-5 h-5 text-sui" strokeWidth={1.75} />
          <Kicker>B2B Intelligence</Kicker>
        </div>
        <h2 className="text-lg lg:text-xl mb-2">B2B Threat Intelligence API</h2>
        <p className="text-mid mb-6">
          Query the indexed threat registry. Powered by real-time event indexing from the on-chain{' '}
          <code className={inlineCode}>ReputationRegistry</code>.
        </p>

        <EndpointHead method="GET" path="/api/threats" />
        <p className="text-mid text-sm mt-2 mb-3">Query indexed threats with optional filters.</p>
        <CodeBlock
          title="http"
          className="mb-6"
          code={`# All threats
GET /api/threats

# Filter by category
GET /api/threats?category=Honeypot
GET /api/threats?category=Intent+Mismatch

# Filter by severity
GET /api/threats?severity=Critical
GET /api/threats?severity=High

# Pagination
GET /api/threats?limit=10&offset=0

# Lookup specific package
GET /api/threats?packageId=0x...

# Aggregated stats
GET /api/threats?stats=true

# Force re-index from chain
GET /api/threats?refresh=true`}
        />

        <div className="border-t border-line-soft pt-6">
          <EndpointHead method="GET" path="/api/threats?stats=true" />
          <p className="text-mid text-sm mt-2 mb-3">Returns aggregated threat statistics.</p>
          <CodeBlock
            title="json"
            className="mb-6"
            code={`{
  "success": true,
  "stats": {
    "total": 5,
    "byCategory": {
      "Intent Mismatch": 1,
      "Unknown": 4
    },
    "bySeverity": {
      "High": 1,
      "Unknown": 4
    }
  }
}`}
          />
        </div>

        <div className="border-t border-line-soft pt-6">
          <EndpointHead method="GET" path="/api/events" />
          <p className="text-mid text-sm mt-2 mb-3">
            Server-Sent Events stream. Subscribe to real-time <code className={inlineCode}>ThreatReported</code>{' '}
            events as they are emitted on-chain.
          </p>
          <CodeBlock
            title="javascript"
            className="mb-6"
            code={`// Browser / Node.js
const stream = new EventSource('https://vibeguardai.xyz/api/events');

stream.onmessage = (event) => {
  const threat = JSON.parse(event.data);
  console.log('New threat:', threat.malicious_package_id);
  blacklist.add(threat.malicious_package_id);
};`}
          />
        </div>

        <div className="border-t border-line-soft pt-6">
          <EndpointHead method="POST" path="/api/webhooks" />
          <p className="text-mid text-sm mt-2 mb-3">
            Register a webhook URL to receive push notifications when new threats are detected.
          </p>
          <CodeBlock
            title="curl"
            className="mb-6"
            code={`curl -X POST https://vibeguardai.xyz/api/webhooks \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["ThreatReported", "ThreatVerified"],
    "apiKey": "your_key"
  }'

// Payload delivered to your URL:
{
  "event": "ThreatReported",
  "data": {
    "malicious_package_id": "0x...",
    "walrus_blob_id": "..."
  },
  "timestamp": 1775909610023
}`}
          />
        </div>

        <div className="border-t border-line-soft pt-6">
          <EndpointHead method="POST" path="/api/indexer" />
          <p className="text-mid text-sm mt-2 mb-3">
            Force re-index all <code className={inlineCode}>ThreatReported</code> events from the blockchain.
          </p>
          <CodeBlock
            title="curl"
            code={`curl -X POST https://vibeguardai.xyz/api/indexer

// Response:
{
  "success": true,
  "indexed": 5,
  "stats": {
    "total": 5,
    "byCategory": { "Intent Mismatch": 1, "Unknown": 4 }
  }
}`}
          />
        </div>
      </section>

      <section id="threat-retrieval" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <Kicker>Threat Retrieval</Kicker>
        <EndpointHead method="GET" path="/api/threat/[blobId]" />
        <p className="text-mid mt-3 mb-4">
          Retrieve a full threat report from Walrus decentralized storage. Accepts an optional{' '}
          <code className={inlineCode}>blobObjectId</code> query parameter to verify the Blob NFT is still live
          on Sui before fetching.
        </p>
        <CodeBlock
          title="http"
          code={`# Without liveness check
GET /api/threat/:blobId

# With Blob NFT liveness gate (returns 410 if expired)
GET /api/threat/:blobId?blobObjectId=0x...`}
        />
        <h3 className="text-lg font-semibold mb-3 mt-6">Response</h3>
        <CodeBlock
          title="json"
          code={`{
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
        />
      </section>

      <section id="examples" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <Kicker>Code Examples</Kicker>
        <h2 className="text-lg lg:text-xl mb-4">Example: JavaScript</h2>
        <CodeBlock
          title="javascript"
          code={`const response = await fetch('https://vibeguardai.xyz/api/explain', {
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
        />
      </section>

      <section id="enclave" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <Kicker>Infrastructure</Kicker>
        <h2 className="text-lg lg:text-xl mb-3">Production Enclave</h2>
        <p className="text-mid mb-4">
          Threat analysis runs inside a verified execution enclave (TEE). The enclave signs every
          threat payload with a registered Ed25519 keypair verified on-chain before registry
          commitment.
        </p>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex flex-wrap gap-x-2">
            <span className="text-mid">Endpoint:</span>
            <span className="text-sui">
              {process.env.ENCLAVE_URL || 'http://92.4.140.187:3000'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <span className="text-mid">Public Key:</span>
            <span className="text-sui text-xs break-all">
              a1609cce97d528ebe898e42c3c6fff37309f6f8c7efc0bbd73dfab1e564ac309
            </span>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <span className="text-mid">Max Throughput:</span>
            <span className="text-safe">218.98 req/s @ 50 concurrent</span>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <span className="text-mid">Avg Response Time:</span>
            <span className="text-safe">226ms (stable under load)</span>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <span className="text-mid">Error Rate:</span>
            <span className="text-safe">0.00% across all concurrency levels</span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-mid">Live proof transactions:</p>
          <a
            href="https://suiscan.xyz/testnet/tx/9Dpg1V8BVyu3QtfYh2Uxj31gTm8ehzjUwQVWXDiuK1B7"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sui hover:text-aqua text-xs font-mono transition-colors"
          >
            Enclave Registration: 9Dpg1V8BVyu3QtfYh2Uxj31gTm8ehzjUwQVWXDiuK1B7
          </a>
          <a
            href="https://suiscan.xyz/testnet/tx/CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sui hover:text-aqua text-xs font-mono transition-colors"
          >
            Atomic Threat Report: CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw
          </a>
        </div>
      </section>

      <section id="engine" className="surface p-5 sm:p-7 mb-6 scroll-mt-24">
        <Kicker>Threat Engine</Kicker>
        <h2 className="text-lg lg:text-xl mb-3">Adversarial Threat Detection</h2>
        <p className="text-mid text-sm mb-4">
          Every transaction is checked against these detection flags inside the Nitro enclave. Each flag maps
          to reasons returned in the <code className={inlineCode}>risk.reasons</code> array, so verdicts are
          inspectable, not a black box.
        </p>
        <div className="space-y-3 text-sm">
          {threatFlags.map(({ flag, desc }) => (
            <div key={flag} className="border border-line-soft bg-surface-1 rounded-[var(--radius-ctl)] p-3">
              <code className="font-mono text-warn text-xs">{flag}</code>
              <p className="text-mid text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="support" className="surface p-5 sm:p-7 scroll-mt-24">
        <div className="flex items-center gap-2.5 mb-2">
          <Info className="w-5 h-5 text-sui" strokeWidth={1.75} />
          <Kicker>Support</Kicker>
        </div>
        <h2 className="text-lg lg:text-xl mb-2">Need Help?</h2>
        <p className="text-mid mb-4">Questions about integration or found a bug?</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <ButtonLink
            href="https://github.com/mianohh/vibeguard-ai/issues"
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="md"
          >
            GitHub Issues
          </ButtonLink>
          <ButtonLink
            href="https://www.npmjs.com/package/vibeguard-sui-security"
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="md"
          >
            View on npm
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
