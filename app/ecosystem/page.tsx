import { ArrowUpRight } from 'lucide-react';
import {
  SuiIcon,
  WalrusIcon,
  NitroIcon,
  GoogleIcon,
  SealIcon,
  CheckCircleIcon,
  CrossIcon,
  ShieldCheckIcon,
} from '@/app/components/icons';
import { ButtonLink } from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import SectionHeading from '@/app/components/ui/SectionHeading';

const codeClass =
  'font-mono text-[12px] text-aqua bg-surface-2 border border-line-soft rounded px-1.5 py-0.5 break-all';

const flow = [
  'User (Google OAuth)',
  'zkLogin (ephemeral burner wallet)',
  'Sponsored Transaction (gasless)',
  'Sui (ReputationRegistry)',
  'Walrus (threat evidence)',
  'Nautilus (verified compute)',
  'Seal (agent config protection)',
];

const coreStack = [
  { Icon: SuiIcon, name: 'Sui', text: 'every verdict lands in the on-chain ReputationRegistry wallets query' },
  { Icon: WalrusIcon, name: 'Walrus', text: 'stores the signed evidence blob behind each report' },
  { Icon: SealIcon, name: 'Seal', text: 'only the attested enclave can decrypt agent config' },
  { Icon: NitroIcon, name: 'Nautilus', text: 'TEE compute that signs every threat verdict' },
];

const primitives = [
  {
    Icon: GoogleIcon,
    name: 'zkLogin',
    text: 'reporters sign in with Google, no seed phrase',
    iconClass: 'text-sui',
    used: true,
  },
  {
    Icon: CheckCircleIcon,
    name: 'Sponsored Tx',
    text: 'reporters pay zero gas, we sponsor it',
    iconClass: 'text-safe',
    used: true,
  },
  {
    Icon: CrossIcon,
    name: 'Enoki',
    text: 'not used: native zkLogin covers the flow',
    iconClass: 'text-faint',
    used: false,
  },
  {
    Icon: CrossIcon,
    name: 'DeepBook',
    text: 'out of scope: no order flow in a security product',
    iconClass: 'text-faint',
    used: false,
  },
];

const zkLoginBenefits = [
  'Anyone with a Google account can submit a threat report. No wallet install required.',
  'Your OAuth identity is not linkable to the on-chain address',
  'Keys are ephemeral burners you control. We never hold them.',
  'Paired with sponsored transactions, reporting costs users nothing',
];

const enokiBenefits = [
  'Full control over security reporting UX',
  'Direct Sui primitive integration',
  'Simpler architecture for B2B product',
  'No external service dependencies',
];

const verifiedCompute = [
  { name: 'Entry', code: '', text: 'zkLogin for community reporting' },
  { name: 'State', code: '', text: 'Sui (ReputationRegistry)' },
  { name: 'Compute', code: '', text: 'Nautilus (Rust TEE threat detection inside a verified execution enclave)' },
  {
    name: 'Access',
    code: '',
    text: 'Seal (threat-agent config encrypted under PCR-based policy, inaccessible outside approved enclave)',
  },
  {
    name: 'Verification',
    code: 'ThreatVerified',
    text: 'event emitted on-chain after Ed25519 signature check',
  },
];

const receipts = [
  {
    label: 'Production Enclave Registration (Oracle A1)',
    id: '9Dpg1V8BVyu3QtfYh2Uxj31gTm8ehzjUwQVWXDiuK1B7',
    href: 'https://suiscan.xyz/testnet/tx/9Dpg1V8BVyu3QtfYh2Uxj31gTm8ehzjUwQVWXDiuK1B7',
  },
  {
    label: 'Atomic Threat Report (ThreatVerified + ThreatReported)',
    id: 'CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw',
    href: 'https://suiscan.xyz/testnet/tx/CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw',
  },
  {
    label: 'zkLogin Community Report',
    id: '57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R',
    href: 'https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R',
  },
];

function ReceiptLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex max-w-full items-start gap-1.5 font-mono text-[12.5px] text-sui transition-colors hover:text-aqua"
    >
      <span className="min-w-0 break-all">{children}</span>
      <ArrowUpRight
        className="mt-1 h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={1.75}
      />
    </a>
  );
}

function SectionHeader({
  kicker,
  title,
  lede,
  icon,
}: {
  kicker: string;
  title: string;
  lede?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-low">{kicker}</p>
      <div className="mt-2 flex items-center gap-2.5">
        {icon}
        <h2 className="text-[20px] leading-snug">{title}</h2>
      </div>
      {lede && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-low">{lede}</p>}
    </div>
  );
}

export default function EcosystemPage() {
  return (
    <div className="shell py-10 lg:py-14 max-w-5xl">
      <header className="mb-7 flex items-start gap-4 animate-fade-up">
        <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-tile)] border border-line bg-surface-2">
          <SuiIcon className="h-6 w-6 text-sui" />
        </span>
        <SectionHeading
          kicker="Ecosystem"
          title="Built on Sui primitives you can verify"
          lede="Every layer below is a real integration with a real on-chain artifact. Each claim on this page links to a Sui testnet transaction you can open yourself."
        />
      </header>

      <div className="surface mb-9 flex flex-col gap-5 p-5 animate-fade-up sm:flex-row sm:items-center sm:p-6">
        <ButtonLink href="/#analyze" size="md" className="shrink-0">
          Analyze a transaction
        </ButtonLink>
        <div className="min-w-0 sm:border-l sm:border-line-soft sm:pl-6">
          <p className="mb-1.5 text-sm text-mid">
            Verify the receipts directly:
          </p>
          <ReceiptLink href="https://suiscan.xyz/testnet/tx/CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw">
            ThreatVerified + ThreatReported emitted atomically: CuBdpZ2pDevRRgxccrG6QKcj46ZWpPTR8jwZrpfZLmqw
          </ReceiptLink>
        </div>
      </div>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="System Design"
          title="How a threat report moves through the stack"
          lede="From a reporter signing in with Google to a signed, encrypted verdict anyone can check on-chain."
        />
        <Card className="p-4 animate-fade-up sm:p-5">
          <ol className="divide-y divide-line-soft">
            {flow.map((step, i) => (
              <li key={step} className="flex items-center gap-3.5 px-1 py-3 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 font-mono text-[11px] text-faint tabular">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[13px] text-mid">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Stack Comparison"
          title="Core stack vs ecosystem primitives"
          lede="What each dependency does, and what we deliberately left out."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5 animate-fade-up sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-line-soft pb-4">
              <SuiIcon className="h-5 w-5 text-sui" />
              <h3 className="text-[15px]">Core stack: always in the request path</h3>
            </div>
            <ul className="space-y-3.5">
              {coreStack.map((item) => (
                <li key={item.name} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-mid">
                  <item.Icon className="mt-0.5 h-4 w-4 shrink-0 text-sui" />
                  <span>
                    <span className="font-semibold text-hi">{item.name}:</span> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 animate-fade-up sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-line-soft pb-4">
              <CheckCircleIcon className="h-5 w-5 text-safe" />
              <h3 className="text-[15px]">Primitives used and why</h3>
            </div>
            <ul className="space-y-3.5">
              {primitives.map((item) => (
                <li
                  key={item.name}
                  className={`flex items-start gap-2.5 text-[13.5px] leading-relaxed ${
                    item.used ? 'text-mid' : 'text-low'
                  }`}
                >
                  <item.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.iconClass}`} />
                  <span>
                    <span className={item.used ? 'font-semibold text-hi' : 'font-semibold'}>{item.name}:</span>{' '}
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Authentication"
          title="zkLogin: report threats without a seed phrase"
          icon={<GoogleIcon className="h-6 w-6 text-sui" />}
        />
        <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="p-5 animate-fade-up sm:p-6">
            <h3 className="mb-4 text-[15px]">What it gets you</h3>
            <ul className="space-y-3">
              {zkLoginBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-mid">
                  <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 animate-fade-up">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-low">
              Live proof: a real zkLogin report on Sui testnet
            </p>
            <ReceiptLink href="https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R">
              57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R
            </ReceiptLink>
          </Card>
        </div>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Design Decision"
          title="Why Native zkLogin (Not Enoki)?"
          icon={<SuiIcon className="h-6 w-6 text-sui" />}
        />
        <Card className="p-5 animate-fade-up sm:p-6">
          <p className="mb-4 text-sm leading-relaxed text-mid">
            <span className="font-semibold text-hi">Our Choice:</span> Native zkLogin with custom
            sponsored transaction flow
          </p>
          <ul className="mb-4 space-y-2.5">
            {enokiBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-mid">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line-soft pt-4">
            <p className="text-sm leading-relaxed text-low">
              <span className="font-semibold text-hi">Product Context:</span> VibeGuard is B2B
              security infrastructure. Primary users are wallet providers consuming threat
              intelligence. Community reporting is secondary where current UX is acceptable.
            </p>
          </div>
        </Card>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Scope Clarification"
          title="Why no DeepBookV3?"
          icon={<CrossIcon className="h-6 w-6 text-faint" />}
        />
        <Card className="p-5 animate-fade-up sm:p-6">
          <p className="text-sm leading-relaxed text-mid">
            <span className="font-semibold text-hi">VibeGuard is not a trading product.</span> We
            provide transaction security analysis and threat intelligence. No order flow, no market
            matching, no exchange functionality. DeepBook would be architecturally incorrect.
          </p>
        </Card>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Access Control"
          title="Seal Access Control"
          icon={<SealIcon className="h-6 w-6 text-aqua" />}
        />
        <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-5 animate-fade-up sm:p-6">
            <p className="mb-3 text-[14.5px] font-semibold text-hi">
              Secure input layer for verified compute
            </p>
            <p className="mb-4 text-sm leading-relaxed text-mid">
              The proprietary threat-agent configuration (scoring weights, risk thresholds,
              heuristic rules) is encrypted under a PCR-based Seal policy. Only an enclave whose PCR
              measurements match the registered policy can decrypt and load the configuration.
            </p>
            <ul className="space-y-3 text-[13.5px] leading-relaxed text-mid">
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>
                  Secret encrypted under Seal policy ID <code className={codeClass}>0x00</code> via{' '}
                  <code className={codeClass}>scripts/seal-setup.ts</code>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>
                  Approved enclave registered via{' '}
                  <code className={codeClass}>seal_enclave::register_enclave()</code> , stores PCRs
                  + Ed25519 pubkey on-chain
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>Seal key servers verify PCR measurements before returning key shares</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>
                  Enclave signs output:{' '}
                  <code className={codeClass}>pkg_bytes(32) + blob_bytes + timestamp_ms LE64</code>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>
                  <code className={codeClass}>seal_enclave::verify_and_report()</code> verifies
                  Ed25519 signature before emitting{' '}
                  <code className={codeClass}>ThreatVerified</code>
                </span>
              </li>
            </ul>
          </Card>

          <Card className="p-5 animate-fade-up">
            <p className="mb-3 text-[13px] leading-relaxed text-low">
              EnclaveConfig Object (registered PCRs + public key)
            </p>
            <ReceiptLink href="https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502">
              0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502
            </ReceiptLink>
          </Card>
        </div>
      </section>

      <section className="mb-10 lg:mb-12">
        <SectionHeader
          kicker="Verified Compute"
          title="Product Pattern: Verified-Compute"
          icon={<ShieldCheckIcon className="h-6 w-6 text-sui" />}
        />
        <Card className="p-5 animate-fade-up sm:p-6">
          <ul className="space-y-3 text-[13.5px] leading-relaxed text-mid">
            {verifiedCompute.map((item) => (
              <li key={item.name} className="flex items-start gap-2.5">
                <CheckCircleIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-safe" />
                <span>
                  <span className="font-semibold text-hi">{item.name}:</span>{' '}
                  {item.code && <code className={codeClass}>{item.code}</code>} {item.text}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionHeader
          kicker="On-Chain Evidence"
          title="Receipts you can open yourself"
          lede="Each link opens the transaction on SuiScan (Sui testnet). The emitted events and payload are public and independently verifiable."
          icon={<CheckCircleIcon className="h-6 w-6 text-safe" />}
        />
        <Card className="animate-fade-up overflow-hidden p-1">
          <ul className="divide-y divide-line-soft">
            {receipts.map((receipt) => (
              <li
                key={receipt.id}
                className="flex flex-col justify-between gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-6"
              >
                <span className="text-[14px] font-medium text-hi">{receipt.label}</span>
                <ReceiptLink href={receipt.href}>{receipt.id}</ReceiptLink>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
