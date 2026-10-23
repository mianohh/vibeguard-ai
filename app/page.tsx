import Hero from './components/home/Hero';
import AnalyzeConsole from './components/home/AnalyzeConsole';
import StatsStrip from './components/home/StatsStrip';
import WhyMultiLayer from './components/home/WhyMultiLayer';
import Features from './components/home/Features';
import TrustCTA from './components/home/TrustCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <section id="analyze" className="scroll-mt-20 py-14 lg:py-20 border-t border-line-soft">
        <div className="shell">
          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-sui">
              Analysis
            </p>
            <h2 className="mt-3 text-[clamp(28px,4vw,36px)] leading-[1.12]">
              Analyze a transaction
            </h2>
            <p className="mt-3 text-[16.5px] text-mid leading-relaxed">
              Paste transaction bytes or a serialized PTB. Review simulated effects, transfers, and
              risk indicators.
            </p>
          </div>
          <AnalyzeConsole />
        </div>
      </section>
      <WhyMultiLayer />
      <Features />
      <TrustCTA />
    </>
  );
}
