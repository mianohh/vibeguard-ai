import SectionHeading from '@/app/components/ui/SectionHeading';
import { Boxes, Fingerprint, Radio, ShieldCheck } from 'lucide-react';

const layers = [
  {
    icon: Radio,
    step: '01',
    title: 'Simulate',
    body: 'Preview balance changes, transfers, and called functions, before any of it is final.',
  },
  {
    icon: Boxes,
    step: '02',
    title: 'Analyze',
    body: 'Flag asset outflows, unusual permissions, and known-risk indicators across 13 deterministic checks.',
  },
  {
    icon: ShieldCheck,
    step: '03',
    title: 'Sign',
    body: 'Create a signed analysis record inside an attested enclave. Verify it yourself on-chain.',
  },
  {
    icon: Fingerprint,
    step: '04',
    title: 'Preserve',
    body: 'Store reports in Walrus and anchor records on Sui. Evidence persists independently of this interface.',
  },
];

export default function WhyMultiLayer() {
  return (
    <section id="why" className="scroll-mt-24 py-14 lg:py-20 border-t border-line-soft">
      <div className="shell">
        <SectionHeading
          kicker="How it works"
          title="Review before you sign"
          lede="See what a transaction is expected to do before approving it. VibeGuard runs the simulation, flags risk indicators, and signs the result."
          align="center"
        />

        <div className="relative mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="hidden lg:block absolute top-[46px] left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-line to-transparent" aria-hidden />
          {layers.map((l) => (
            <div key={l.step} className="surface p-5 relative">
              <div className="flex items-center gap-3 mb-3.5">
                <span className="w-10 h-10 rounded-[var(--radius-ctl)] bg-sui/12 border border-sui/30 grid place-items-center text-sui">
                  <l.icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                </span>
                <span className="font-mono text-[11px] text-faint tracking-[0.1em]">{l.step}</span>
              </div>
              <h3 className="text-[15.5px] font-bold mb-1.5">{l.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-low">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
