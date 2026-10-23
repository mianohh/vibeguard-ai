import { ButtonLink } from '@/app/components/ui/Button';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function TrustCTA() {
  return (
    <section className="py-14 lg:py-20 border-t border-line-soft">
      <div className="shell">
        <div className="relative overflow-hidden surface px-6 sm:px-12 py-12 text-center">
          <div
            className="absolute inset-0 bg-gradient-to-r from-sui/[0.14] to-aqua/[0.09] pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-sui">Analysis · not a guarantee</p>
            <h2 className="mt-3 text-[clamp(26px,4vw,34px)] max-w-2xl mx-auto leading-tight">
              Check before you sign.
            </h2>
            <p className="mt-3 text-[16px] text-mid max-w-xl mx-auto leading-relaxed">
              Simulate the transaction and review its risk indicators. Each analysis produces a
              signed record you can verify on-chain.
            </p>
            <p className="mt-2 font-mono text-[12px] text-faint">
              VibeGuard provides analysis, not a guarantee of safety.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3.5">
              <ButtonLink href="/#analyze" size="lg">
                Analyze a transaction
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </ButtonLink>
              <ButtonLink href="/api-docs" variant="secondary" size="lg">
                <BookOpen className="w-4 h-4" strokeWidth={1.75} />
                View API docs
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
