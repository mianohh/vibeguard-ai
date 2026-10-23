'use client';

import { useState } from 'react';
import type { AnalysisResult, ApiError, SuiNetwork } from '@/types';
import { ArrowRight, FileText, Loader2, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import Field, { inputClass } from '@/app/components/ui/Field';
import VerdictBanner from '@/app/components/ui/VerdictBanner';
import { levelTone } from '@/app/components/ui/StatusPill';
import { EmptyState, Skeleton } from '@/app/components/ui/Skeleton';

const networks: SuiNetwork[] = ['testnet', 'mainnet', 'devnet'];

function fmtAmount(amount: string) {
  try {
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    return (n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return amount;
  }
}

function coinLabel(coinType: string) {
  const parts = coinType.split('::');
  return parts[parts.length - 1] || coinType;
}

function ResultDetails({ result }: { result: AnalysisResult }) {
  const { simulation, risk, explanation } = result;
  const fx = simulation.effectsSummary;
  const tone = levelTone(risk.riskLevel);
  const actionTone =
    explanation.recommendedAction === 'Do Not Sign'
      ? 'text-danger'
      : explanation.recommendedAction === 'Be Careful'
        ? 'text-warn'
        : 'text-safe';

  return (
    <div className="space-y-5 animate-fade-up">
      <VerdictBanner
        level={risk.riskLevel}
        headline={`${risk.riskLevel}: ${explanation.headline}`}
        body={explanation.plainEnglish}
        meta={`${explanation.recommendedAction} · confidence ${(risk.confidence * 100).toFixed(0)}% · ${risk.reasons.length} signal${risk.reasons.length === 1 ? '' : 's'}`}
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="surface rounded-[var(--radius-tile)] px-4 py-3.5">
          <div className="font-mono text-[20px] font-semibold text-hi tabular">{fx.gasUsed || '—'}</div>
          <div className="text-[11.5px] text-low mt-1">gas units used</div>
        </div>
        <div className="surface rounded-[var(--radius-tile)] px-4 py-3.5">
          <div className={`font-mono text-[20px] font-semibold ${actionTone}`}>
            {explanation.recommendedAction}
          </div>
          <div className="text-[11.5px] text-low mt-1">recommended action</div>
        </div>
        <div className="surface rounded-[var(--radius-tile)] px-4 py-3.5">
          <div className="font-mono text-[20px] font-semibold text-hi tabular">
            {tone === 'danger' ? 'BLOCK' : tone === 'warn' ? 'CAUTION' : 'CLEAR'}
          </div>
          <div className="text-[11.5px] text-low mt-1">pre-sign gate</div>
        </div>
      </div>

      {explanation.bulletPoints.length > 0 && (
        <div className="surface p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">What happens if you sign</p>
          <ul className="space-y-2">
            {explanation.bulletPoints.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] text-mid leading-relaxed">
                <span className="text-faint font-mono text-[12px] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(fx.balanceChanges.length > 0 || fx.transfers.length > 0) && (
        <div className="surface p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">Asset movements</p>
          <div className="space-y-2 font-mono text-[12.5px]">
            {fx.balanceChanges.map((bc, i) => (
              <div
                key={`b${i}`}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${
                  bc.type === 'decrease' && bc.owner !== 'you'
                    ? 'bg-danger-soft border-danger-line'
                    : bc.type === 'decrease'
                      ? 'bg-surface-2 border-line'
                      : 'bg-safe-soft border-safe-line'
                }`}
              >
                <span className={bc.type === 'decrease' ? 'text-danger' : 'text-safe'}>
                  {bc.type === 'decrease' ? '−' : '+'}
                  {fmtAmount(bc.amount)} {coinLabel(bc.coinType)}
                </span>
                <span className="text-low text-[11px] uppercase tracking-wider">
                  {bc.owner === 'you' ? 'you' : bc.owner === 'smart_contract' ? 'contract' : 'other address'}
                </span>
              </div>
            ))}
            {fx.transfers.map((t, i) => (
              <div key={`t${i}`} className="text-low px-3 py-2 rounded-lg bg-surface-2 border border-line">
                transfer · from {t.from} → to {t.to} · {fmtAmount(t.amount)} {coinLabel(t.coinType)}
              </div>
            ))}
          </div>
        </div>
      )}

      {risk.reasons.length > 0 && (
        <div className="surface p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">Signals · evidence</p>
          <ul className="space-y-2.5">
            {risk.reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] text-mid leading-relaxed">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    levelTone(risk.riskLevel) === 'danger'
                      ? 'bg-danger'
                      : levelTone(risk.riskLevel) === 'warn'
                        ? 'bg-warn'
                        : 'bg-safe'
                  }`}
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.whatToCheck.length > 0 && (
        <div className="surface p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low mb-3">Double-check yourself</p>
          <ul className="space-y-2">
            {explanation.whatToCheck.map((w, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] text-low">
                <FileText className="w-3.5 h-3.5 text-aqua mt-1 flex-shrink-0" strokeWidth={1.75} />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {simulation.staticAnalysis && (
        <div className="font-mono text-[11.5px] text-faint flex flex-wrap gap-x-4 gap-y-1 px-1">
          <span>verify: source {fx.success ? 'ok' : 'dry-run failed'}</span>
          <span>high-gas: {simulation.staticAnalysis.isHighGas ? 'yes' : 'no'}</span>
          <span>direct-transfer: {simulation.staticAnalysis.containsDirectTransfer ? 'yes' : 'no'}</span>
          <span>network-match: {simulation.staticAnalysis.networkMismatch ? 'MISMATCH' : 'ok'}</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyzeConsole() {
  const [transactionBytes, setTransactionBytes] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [network, setNetwork] = useState<SuiNetwork>('testnet');
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const handleAnalyze = async () => {
    if (!transactionBytes.trim()) {
      setError({ error: 'Transaction input required' });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBytes: transactionBytes.trim(),
          network,
          userAddress: userAddress.trim() || undefined,
          userIntent: userIntent.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError({
        error: 'Network error occurred',
        details: 'Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 items-start">
      <div className="surface p-5 sm:p-7 animate-fade-up">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-bold">Analyze a transaction</h3>
          <div className="flex gap-1 font-mono text-[11px]">
            {networks.map((n) => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  network === n
                    ? 'bg-sui/15 border-sui/50 text-sui'
                    : 'border-line text-faint hover:text-mid'
                }`}
                aria-pressed={network === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-low mb-5">
          Paste transaction bytes or a serialized PTB.
        </p>

        <div className="space-y-4">
          <Field label="Transaction bytes" htmlFor="tx-bytes" required>
            <textarea
              id="tx-bytes"
              placeholder="AAAA… (base64 transaction bytes)"
              rows={5}
              value={transactionBytes}
              onChange={(e) => setTransactionBytes(e.target.value)}
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </Field>

          <button
            type="button"
            onClick={() => setAdvanced(!advanced)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-low hover:text-sui transition-colors cursor-pointer"
          >
            {advanced ? '▾' : '▸'} advanced context (optional)
          </button>

          {advanced && (
            <div className="grid sm:grid-cols-2 gap-4 animate-fade-up">
              <Field label="Your address" htmlFor="user-address" hint="Improves ‘you vs other’ ownership labels">
                <input
                  id="user-address"
                  type="text"
                  placeholder="0x…"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Your intent" htmlFor="user-intent" hint="What you believe this tx does">
                <input
                  id="user-intent"
                  type="text"
                  placeholder="e.g. swap 1 SUI for USDC"
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          <Button full size="lg" onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                Simulating on {network}…
              </>
            ) : (
              <>
                Run analysis
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 flex items-center gap-4 font-mono text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-safe" strokeWidth={1.75} />
            signed analysis record
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-aqua" strokeWidth={1.75} />
            no wallet required
          </span>
        </div>
      </div>

      <div className="min-h-[320px]" aria-live="polite">
        {loading && (
          <div className="surface p-5 sm:p-7 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <p className="font-mono text-[11.5px] text-low animate-pulse-dot">
              running 13 deterministic checks…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="animate-fade-up">
            <VerdictBanner
              level="YELLOW"
              headline={error.error}
              body={error.details || 'The engine could not complete this analysis. Try another network or input.'}
            />
          </div>
        )}

        {!loading && !error && !result && (
          <div className="surface">
            <EmptyState
              icon={<Sparkles className="w-7 h-7" strokeWidth={1.5} />}
              title="No analysis yet"
              body="Paste a transaction to begin. Review simulated effects, transfers, and risk indicators."
            />
          </div>
        )}

        {!loading && !error && result && <ResultDetails result={result} />}
      </div>
    </div>
  );
}
