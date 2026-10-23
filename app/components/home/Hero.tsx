'use client';

import { ButtonLink } from '@/app/components/ui/Button';
import { ArrowRight, FileCheck, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="shell grid lg:grid-cols-[1.25fr_.9fr] gap-10 items-center py-14 lg:py-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-sui border border-sui/35 bg-sui/[0.07] rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse-dot" />
            Pre-transaction analysis · built on Sui
          </span>

          <h1 className="mt-5 text-[clamp(40px,6vw,58px)] leading-[1.04] tracking-[-0.03em]">
            Understand a transaction
            <br />
            <span className="grad-text">before you sign.</span>
          </h1>

          <p className="mt-4.5 text-[17.5px] leading-relaxed text-mid max-w-[34rem]">
            Simulate its effects, review asset movements, and check risk indicators. Each analysis
            produces a signed, verifiable record.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <ButtonLink href="/#analyze" size="lg">
              Analyze a transaction
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </ButtonLink>
            <ButtonLink href="/demo" variant="ghost" size="lg">
              <Play className="w-4 h-4" strokeWidth={1.75} />
              Watch the demo
            </ButtonLink>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11.5px] text-low">
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-safe" strokeWidth={1.75} />
              signed analysis records
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-safe" strokeWidth={1.75} />
              built on Sui
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-safe" strokeWidth={1.75} />
              deterministic checks
            </span>
          </div>
        </div>

        <div className="hidden lg:block relative animate-fade-up" style={{ animationDelay: '0.12s' }}>
          <div className="absolute -inset-6 bg-sui/10 blur-3xl rounded-full pointer-events-none" aria-hidden />
          <div className="relative surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-full bg-safe-soft border-safe-line border grid place-items-center text-safe">
                <FileCheck className="w-4.5 h-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[14px] font-semibold text-hi">Transaction analysis</div>
                <div className="font-mono text-[11px] text-faint">testnet · simulation complete</div>
              </div>
            </div>
            <div className="space-y-2.5 font-mono text-[12px]">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-2 border border-line">
                <span className="text-low">risk indicators</span>
                <span className="text-safe font-semibold">none detected</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-2 border border-line">
                <span className="text-low">signals</span>
                <span className="text-sui">0 / 13 triggered</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-2 border border-line">
                <span className="text-low">record</span>
                <span className="text-aqua">signed</span>
              </div>
              <p className="text-low px-1 pt-1.5 leading-relaxed">
                No outbound asset transfers identified.
              </p>
            </div>
            <p className="mt-3 font-mono text-[10.5px] text-faint leading-relaxed px-1">
              Simulation results are informational. Review transaction details before signing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
