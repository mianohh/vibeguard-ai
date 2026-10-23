import SectionHeading from '@/app/components/ui/SectionHeading';
import Card from '@/app/components/ui/Card';
import { Activity, Braces, Coins, Layers, ShieldCheck, Users } from 'lucide-react';

const features = [
  {
    icon: Activity,
    title: 'Deterministic checks',
    body: 'Apply defined security rules to simulated effects. Same input produces the same result every time.',
  },
  {
    icon: ShieldCheck,
    title: 'Signed analysis records',
    body: 'Each result is signed inside an attested enclave. Verify the record independently against the chain.',
  },
  {
    icon: Layers,
    title: 'Persistent evidence',
    body: 'Reports are stored in Walrus and anchored on Sui. Records remain accessible beyond this interface.',
  },
  {
    icon: Users,
    title: 'Community reporting',
    body: 'Report suspicious packages with a Google sign-in. No wallet installation required.',
  },
  {
    icon: Coins,
    title: 'Sponsored reports',
    body: 'Gas fees for eligible reports are covered. Reporting a risk costs you nothing.',
  },
  {
    icon: Braces,
    title: 'Developer API',
    body: 'Add pre-signature analysis to wallets and dApps via a single POST endpoint or a live event feed.',
  },
];

export default function Features() {
  return (
    <section className="py-14 lg:py-20 border-t border-line-soft scroll-mt-24" id="features-section">
      <div className="shell">
        <SectionHeading
          kicker="Capabilities"
          title="What VibeGuard provides"
          lede="From a single transaction input to an institutional analysis feed, every capability is grounded in on-chain verifiable results."
          align="center"
        />

        <div className="mt-9 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} hover className="p-6">
              <span className="w-10 h-10 rounded-[var(--radius-ctl)] bg-sui/12 border border-sui/25 grid place-items-center text-sui mb-4">
                <f.icon className="w-5 h-5" strokeWidth={1.75} />
              </span>
              <h3 className="text-[15.5px] font-bold mb-1.5">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-low">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
