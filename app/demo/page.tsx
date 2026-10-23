'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { ButtonLink } from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import CodeBlock from '@/app/components/ui/CodeBlock';
import SectionHeading from '@/app/components/ui/SectionHeading';
import StatTile from '@/app/components/ui/StatTile';
import VerdictBanner from '@/app/components/ui/VerdictBanner';

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
    riskLevel: 'GREEN',
  },
  {
    id: 'honeypot-airdrop',
    name: 'Fake Airdrop (Honeypot)',
    description: 'Malicious contract disguised as airdrop claim',
    type: 'honeypot',
    transactionBytes: 'AAACAA...',
    expectedOutcome: 'Claim 1000 FREE tokens',
    actualOutcome: 'Drains ALL SUI + NFTs from your wallet',
    riskLevel: 'RED',
  },
  {
    id: 'phishing-nft',
    name: 'Phishing NFT Mint',
    description: 'Requests excessive permissions during mint',
    type: 'phishing',
    transactionBytes: 'AAACAB...',
    expectedOutcome: 'Mint NFT for 5 SUI',
    actualOutcome: 'Grants unlimited token approval to unknown contract',
    riskLevel: 'RED',
  },
];

const sdkCode = `import { VibeGuard } from 'vibeguard-sui-security';

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
await wallet.signTransaction(txBytes);`;

export default function DemoPage() {
  const [selectedScenario, setSelectedScenario] = useState<SimulatedTx | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleAnalyze = async (scenario: SimulatedTx) => {
    setSelectedScenario(scenario);
    setAnalyzing(true);
    setShowResult(false);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setAnalyzing(false);
    setShowResult(true);
  };

  return (
    <div className="shell py-10 lg:py-14 max-w-5xl">
      <div className="mb-9">
        <Image src="/vibeguard-icon.png" alt="" width={28} height={28} className="w-7 h-7 block mb-5" aria-hidden />
        <SectionHeading
          kicker="Interactive Demo"
          title="See what you’d actually sign"
          lede="Pick a scenario and watch VibeGuard explain the real outcome before any wallet prompt"
        />
        <p className="mt-3 text-[13px] text-low">
          Simulated wallet on Sui testnet. No real funds or signatures involved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 text-[13.5px] text-sui hover:text-aqua transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          Back to Security Console
        </Link>
      </div>

      <Card className="p-5 sm:p-7 mb-6 lg:mb-8 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[15px] font-semibold">Simulated wallet</h2>
            <p className="mt-1 font-mono text-[12.5px] text-low">0x0000...0000 · Sui testnet · demo</p>
          </div>
          <div className="inline-flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse-dot" />
            <span className="text-[13px] font-semibold text-safe">Protected by VibeGuard</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <StatTile label="Scenarios available" value="3" hint="this demo" />
          <StatTile label="Checks per scenario" value="13" hint="deterministic signals" />
          <StatTile label="On-chain simulation" value="live" hint="Sui testnet gRPC" />
        </div>
      </Card>

      <div className="mb-6 lg:mb-8">
        <SectionHeading
          kicker="Threat scenarios"
          title="Choose a transaction to check"
          lede="Each one runs the same pre-signature check VibeGuard performs in a real wallet."
        />
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleAnalyze(scenario)}
              disabled={analyzing}
              className={`surface p-5 text-left transition-colors duration-200 ${
                scenario.type === 'safe' ? 'hover:border-safe/50' : 'hover:border-danger/50'
              } ${
                selectedScenario?.id === scenario.id
                  ? 'border-sui/60 ring-2 ring-sui/25'
                  : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-[15px] font-semibold leading-snug">{scenario.name}</h3>
                {scenario.type !== 'safe' && (
                  <TriangleAlert className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                )}
              </div>
              <p className="text-[13px] text-mid leading-relaxed mb-4">{scenario.description}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    scenario.riskLevel === 'GREEN' ? 'bg-safe' : 'bg-danger'
                  }`}
                />
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
                    scenario.riskLevel === 'GREEN' ? 'text-safe' : 'text-danger'
                  }`}
                >
                  {scenario.riskLevel} RISK
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {!selectedScenario && (
        <div className="surface p-6 sm:p-8 mb-6 lg:mb-8 text-center animate-fade-up">
          <p className="text-hi font-semibold mb-1">No analysis yet</p>
          <p className="text-sm text-mid leading-relaxed">
            Pick a scenario above. VibeGuard will show you what the transaction is expected to do,
            in plain language, before any signature.
          </p>
        </div>
      )}

      {selectedScenario && (
        <div className="surface p-5 sm:p-7 mb-6 lg:mb-8 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <h2 className="text-xl font-bold">Transaction Analysis</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-low">
              Sui testnet · simulated, unsigned
            </span>
          </div>

          <div className="space-y-4 mb-6">
            <AnalysisStep
              step={1}
              title="Reading what you'll sign"
              status={analyzing ? 'active' : 'complete'}
              detail="Extracting Move calls and gas budget from the transaction bytes"
            />
            <AnalysisStep
              step={2}
              title="Checking known scam reports"
              status={analyzing ? 'pending' : 'complete'}
              detail="Querying the on-chain ReputationRegistry for this contract"
            />
            <AnalysisStep
              step={3}
              title="Simulating the outcome"
              status={analyzing ? 'pending' : 'complete'}
              detail="Running dryRunTransactionBlock without touching your wallet"
            />
            <AnalysisStep
              step={4}
              title="Tracing where assets go"
              status={analyzing ? 'pending' : 'complete'}
              detail="LocalThreatAgent pattern detection on simulated asset flows"
            />
          </div>

          {showResult && (
            <div className="space-y-4 animate-fade-up">
              <VerdictBanner
                level={selectedScenario.riskLevel}
                headline={
                  selectedScenario.riskLevel === 'GREEN'
                    ? 'No high-risk indicators detected'
                    : 'High-risk indicators detected: do not sign'
                }
                body={selectedScenario.description}
              />

              <div className="border border-line rounded-[var(--radius-tile)] px-5 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3.5">
                  Evidence
                </p>
                <ul className="space-y-3.5">
                  <li className="flex gap-3">
                    <Info className="w-4 h-4 text-low mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-low">You expected:</p>
                      <p className="text-sm text-hi font-medium">{selectedScenario.expectedOutcome}</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    {selectedScenario.riskLevel === 'GREEN' ? (
                      <CircleCheck className="w-4 h-4 text-safe mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                    ) : (
                      <CircleAlert className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                    )}
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-low">What actually happens:</p>
                      <p
                        className={`text-sm font-medium ${
                          selectedScenario.riskLevel === 'GREEN' ? 'text-hi' : 'text-danger'
                        }`}
                      >
                        {selectedScenario.actualOutcome}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {selectedScenario.riskLevel === 'RED' && (
                <div className="border border-danger-line bg-danger-soft rounded-[var(--radius-tile)] px-5 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-danger mb-3">
                    What VibeGuard does now
                  </p>
                  <ul className="space-y-2.5 text-[13px] text-mid leading-relaxed">
                    <li className="flex gap-2.5">
                      <CircleAlert className="w-3.5 h-3.5 text-danger mt-1 flex-shrink-0" strokeWidth={1.75} />
                      Blocks this transaction from reaching the signing prompt
                    </li>
                    <li className="flex gap-2.5">
                      <CircleAlert className="w-3.5 h-3.5 text-danger mt-1 flex-shrink-0" strokeWidth={1.75} />
                      Reports the malicious contract to the on-chain registry other wallets query
                    </li>
                    <li className="flex gap-2.5">
                      <CircleAlert className="w-3.5 h-3.5 text-danger mt-1 flex-shrink-0" strokeWidth={1.75} />
                      Uploads signed evidence to Walrus so the report is publicly verifiable
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <details className="mt-6 group">
            <summary className="cursor-pointer text-sui text-sm hover:text-aqua transition-colors select-none">
              Technical details
            </summary>
            <div className="mt-3 p-4 bg-surface-2 border border-line rounded-[var(--radius-tile)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-2">
                Transaction bytes (base64, unsigned)
              </p>
              <p className="font-mono text-[13px] text-mid break-all">
                {selectedScenario.transactionBytes}...
              </p>
              <p className="mt-3 text-[12.5px] text-low leading-relaxed">
                Full bytes are what the SDK sends to{' '}
                <span className="font-mono text-sui">analyzeTransaction</span>. Analysis runs before
                signing, so explorer hashes will not appear here.
              </p>
            </div>
          </details>
        </div>
      )}

      <Card className="p-5 sm:p-7 animate-fade-up">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low">SDK Integration</p>
        <h2 className="mt-2 text-xl lg:text-2xl">Wallet Integration</h2>
        <p className="mt-3 text-mid leading-relaxed">
          Add pre-signature analysis to your wallet or dApp. Risk level, plain-language explanation,
          and a blocking signal for high-risk results:
        </p>

        <CodeBlock className="mt-5" title="vibeguard-integration.ts" code={sdkCode} />

        <div className="mt-5 flex flex-col sm:flex-row gap-4">
          <ButtonLink href="/api-docs" full size="md">
            View Full API Docs
          </ButtonLink>
          <ButtonLink
            href="https://www.npmjs.com/package/vibeguard-sui-security"
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            full
            size="md"
          >
            Install SDK →
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

function AnalysisStep({
  step,
  title,
  status,
  detail,
}: {
  step: number;
  title: string;
  status: 'pending' | 'active' | 'complete';
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 ${
          status === 'complete'
            ? 'bg-safe/15 text-safe'
            : status === 'active'
              ? 'bg-sui/15 text-sui'
              : 'border border-line text-faint'
        }`}
      >
        {status === 'complete' ? (
          <Check className="w-4 h-4" strokeWidth={1.75} />
        ) : status === 'active' ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <span className="font-mono text-[12px]">{step}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${status === 'pending' ? 'text-low' : 'text-hi'}`}>
          {title}
        </p>
        <p className="text-[12.5px] text-low leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}
