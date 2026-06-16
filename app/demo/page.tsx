'use client';

import { useState } from 'react';
import Link from 'next/link';

type DemoScenario = 'honeypot' | 'phishing' | 'safe';

interface SimulatedTx {
  id: string;
  name: string;
  description: string;
  type: DemoScenario;
  transactionBytes: string;
  expectedOutcome: string;
  actualOutcome: string;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
}

const DEMO_SCENARIOS: SimulatedTx[] = [
  {
    id: 'safe-swap',
    name: 'Safe Token Swap',
    description: 'Legitimate DEX swap on Cetus Protocol',
    type: 'safe',
    transactionBytes: 'AAACAAg...',
    expectedOutcome: 'Swap 100 SUI for USDC',
    actualOutcome: 'Receives ~95 USDC, pays 100 SUI + 0.3% fee',
    riskLevel: 'GREEN'
  },
  {
    id: 'honeypot-airdrop',
    name: 'Fake Airdrop (Honeypot)',
    description: 'Malicious contract disguised as airdrop claim',
    type: 'honeypot',
    transactionBytes: 'AAACAA...',
    expectedOutcome: 'Claim 1000 FREE tokens',
    actualOutcome: 'Drains ALL SUI + NFTs from your wallet',
    riskLevel: 'RED'
  },
  {
    id: 'phishing-nft',
    name: 'Phishing NFT Mint',
    description: 'Requests excessive permissions during mint',
    type: 'phishing',
    transactionBytes: 'AAACAB...',
    expectedOutcome: 'Mint NFT for 5 SUI',
    actualOutcome: 'Grants unlimited token approval to unknown contract',
    riskLevel: 'RED'
  }
];

export default function DemoPage() {
  const [selectedScenario, setSelectedScenario] = useState<SimulatedTx | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleAnalyze = async (scenario: SimulatedTx) => {
    setSelectedScenario(scenario);
    setAnalyzing(true);
    setShowResult(false);

    await new Promise(resolve => setTimeout(resolve, 2000));

    setAnalyzing(false);
    setShowResult(true);
  };

  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      <div className="purple-section-blur" />

      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-10 max-w-5xl section-divider">
        <div className="text-center mb-12">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Interactive Demo</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="sui-symbol w-12 h-12" />
            <h1 className="text-5xl font-display font-bold">
              <span className="gradient-text-purple">Live Demo</span>
            </h1>
          </div>
          <p className="text-xl text-lightblue font-medium">
            See VibeGuard detect real threats in action
          </p>
          <p className="text-lightpurple mt-2 text-sm">
            Simulated wallet integration showing how VibeGuard protects users before they sign
          </p>

          <div className="mt-6">
            <Link
              href="/"
              className="text-sui-cyan hover:text-sui-aqua transition-colors text-sm font-semibold"
            >
              ← Back to Security Console
            </Link>
          </div>
        </div>

        <div className="glass-card p-5 lg:p-8 mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Simulated Wallet</h2>
              <p className="text-lightblue text-sm">Connected: 0x742d...89a3</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-status-safe rounded-full animate-pulse" />
              <span className="text-status-safe text-sm font-semibold">Protected by VibeGuard</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 p-4 bg-ocean-mid/30 rounded-lg border border-ocean-surface">
            <div>
              <div className="text-primary text-xs font-semibold mb-1">Balance</div>
              <div className="text-white font-bold">1,234.56 SUI</div>
            </div>
            <div>
              <div className="text-primary text-xs font-semibold mb-1">NFTs</div>
              <div className="text-white font-bold">12 Items</div>
            </div>
            <div>
              <div className="text-primary text-xs font-semibold mb-1">Threats Blocked</div>
              <div className="text-status-danger font-bold">3 Today</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Threat Scenarios</p>
          <h3 className="text-xl font-bold text-white mb-4">Try These Scenarios</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleAnalyze(scenario)}
                disabled={analyzing}
                className={`glass-card p-4 lg:p-6 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                  scenario.type === 'safe' ? 'hover:border-status-safe' : 'hover:border-status-danger'
                } ${selectedScenario?.id === scenario.id ? 'ring-2 ring-primary/50' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-white text-lg">{scenario.name}</h4>
                  {scenario.type !== 'safe' && (
                    <svg className="w-6 h-6 text-status-warning" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-lightblue text-sm mb-4">{scenario.description}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${scenario.riskLevel === 'GREEN' ? 'bg-status-safe' : 'bg-status-danger'}`} />
                  <span className={`text-xs font-semibold ${scenario.riskLevel === 'GREEN' ? 'text-status-safe' : 'text-status-danger'}`}>
                    {scenario.riskLevel} RISK
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedScenario && (
          <div className="glass-card p-5 lg:p-8 mb-6 lg:mb-8 liquid-expand">
            <h3 className="text-2xl font-bold text-white mb-6">Transaction Analysis</h3>

            <div className="mb-6 p-4 bg-ocean-mid/30 rounded-lg border border-ocean-surface">
              <div className="text-lightblue text-xs mb-2">TRANSACTION BYTES</div>
              <div className="font-mono text-sm text-gray-300 break-all">
                {selectedScenario.transactionBytes}...
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <AnalysisStep
                step={1}
                title="Parsing Transaction"
                status={analyzing ? 'active' : 'complete'}
                detail="Extracting Move calls and gas budget"
              />
              <AnalysisStep
                step={2}
                title="Checking Reputation Registry"
                status={analyzing ? 'pending' : 'complete'}
                detail="Querying on-chain threat database"
              />
              <AnalysisStep
                step={3}
                title="Simulating Execution"
                status={analyzing ? 'pending' : 'complete'}
                detail="Running dryRunTransactionBlock"
              />
              <AnalysisStep
                step={4}
                title="Analyzing Asset Flows"
                status={analyzing ? 'pending' : 'complete'}
                detail="LocalThreatAgent pattern detection"
              />
            </div>

            {showResult && (
              <div className={`p-6 rounded-lg border-2 ${
                selectedScenario.riskLevel === 'GREEN'
                  ? 'bg-green-900/20 border-status-safe'
                  : 'bg-red-900/20 border-status-danger'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    selectedScenario.riskLevel === 'GREEN' ? 'bg-status-safe/20' : 'bg-status-danger/20'
                  }`}>
                    {selectedScenario.riskLevel === 'GREEN' ? '✓' : '⚠'}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-xl font-bold mb-2 ${
                      selectedScenario.riskLevel === 'GREEN' ? 'text-status-safe' : 'text-status-danger'
                    }`}>
                      {selectedScenario.riskLevel === 'GREEN' ? 'Safe to Sign' : 'THREAT DETECTED - DO NOT SIGN'}
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-lightblue mb-1">You Expected:</div>
                        <div className="text-white font-medium">{selectedScenario.expectedOutcome}</div>
                      </div>
                      <div>
                        <div className="text-lightblue mb-1">What Actually Happens:</div>
                        <div className={`font-medium ${
                          selectedScenario.riskLevel === 'GREEN' ? 'text-white' : 'text-status-danger'
                        }`}>
                          {selectedScenario.actualOutcome}
                        </div>
                      </div>
                    </div>

                    {selectedScenario.riskLevel === 'RED' && (
                      <div className="mt-4 p-3 bg-red-900/30 rounded border border-red-700">
                        <div className="text-xs text-red-300 font-semibold mb-1">AUTOMATIC PROTECTION</div>
                        <div className="text-xs text-gray-300">
                          Transaction blocked from signing<br/>
                          Malicious contract reported to on-chain registry<br/>
                          Evidence uploaded to Walrus for ecosystem protection
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="glass-card p-5 lg:p-8">
          <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">SDK Integration</p>
          <h3 className="text-xl lg:text-2xl font-bold text-white mb-4">Wallet Integration</h3>
          <p className="text-lightblue mb-4 lg:mb-6">
            Add VibeGuard protection to your wallet or dApp with 3 lines of code:
          </p>

          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot red" />
              <div className="terminal-dot yellow" />
              <div className="terminal-dot green" />
              <span className="text-xs text-gray-400 ml-2">vibeguard-integration.ts</span>
            </div>
            <pre className="terminal-body overflow-x-auto">
{`import { VibeGuard } from 'vibeguard-sui-security';

const guard = new VibeGuard();

// Before user signs transaction
const result = await guard.analyzeTransaction({
  transactionBytes: txBytes,
  network: 'mainnet',
  userAddress: wallet.address,
  userIntent: 'Claim airdrop'
});

if (result.riskLevel === 'RED') {
  alert('THREAT DETECTED: ' + result.explanation.headline);
  return; // Block signing
}

// Safe to proceed
await wallet.signTransaction(txBytes);`}
            </pre>
          </div>

          <div className="mt-4 lg:mt-6 flex flex-col sm:flex-row gap-4">
            <Link href="/api-docs" className="btn-purple flex-1 text-center">
              <span className="relative z-10">View Full API Docs</span>
            </Link>
            <a
              href="https://www.npmjs.com/package/vibeguard-sui-security"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card px-6 py-3 hover:border-sui-cyan transition-all text-center flex-1"
            >
              <span className="text-sui-cyan font-semibold">Install SDK →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisStep({
  step,
  title,
  status,
  detail
}: {
  step: number;
  title: string;
  status: 'pending' | 'active' | 'complete';
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        status === 'complete' ? 'bg-status-safe text-ocean-deepest' : ''
      } ${status === 'active' ? 'bg-sui-cyan text-ocean-deepest animate-pulse' : ''} ${
        status === 'pending' ? 'bg-ocean-surface text-gray-500' : ''
      }`}>
        {status === 'complete' ? '✓' : step}
      </div>
      <div className="flex-1">
        <div className={`font-semibold ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
          {title}
        </div>
        <div className="text-xs text-lightblue">{detail}</div>
      </div>
      {status === 'active' && (
        <div className="w-5 h-5 border-2 border-sui-cyan/30 border-t-sui-cyan rounded-full animate-spin" />
      )}
    </div>
  );
}
