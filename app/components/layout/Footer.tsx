import Link from 'next/link';
import Image from 'next/image';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Analyze a transaction', href: '/#analyze' },
      { label: 'Interactive demo', href: '/demo' },
      { label: 'Threat dashboard', href: '/dashboard' },
      { label: 'Ecosystem', href: '/ecosystem' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API documentation', href: '/api-docs' },
      { label: 'System status', href: '/status' },
      { label: 'GitHub', href: 'https://github.com/mianohh/vibeguard-ai', external: true },
    ],
  },
  {
    title: 'Reporting',
    links: [
      { label: 'Report a scam', href: '/report' },
      { label: 'Verification guide', href: '/api-docs#enclave' },
      { label: 'API docs', href: '/api-docs' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line-soft mt-auto">
      <div className="shell py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 text-hi font-bold text-[16px]">
              <Image src="/vibeguard-icon.png" alt="" width={26} height={26} className="w-[26px] h-[26px] block" aria-hidden />
              VibeGuard
            </Link>
            <p className="mt-3.5 text-[13.5px] leading-relaxed text-low max-w-64">
              Pre-transaction analysis for Sui. Simulate transactions and review signed analysis records.
            </p>
            <a
              href="https://github.com/mianohh/vibeguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="mt-4 inline-flex w-9 h-9 items-center justify-center rounded-[var(--radius-ctl)] border border-line bg-surface-1 text-low hover:text-hi hover:border-sui/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint mb-3.5">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-low hover:text-sui transition-colors"
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="shell py-5 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11.5px] text-faint">
          <span>© {new Date().getFullYear()} VibeGuard AI</span>
          <span>
            Built on{' '}
            <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className="text-sui hover:text-aqua transition-colors">
              Sui
            </a>{' '}
            +{' '}
            <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className="text-sui hover:text-aqua transition-colors">
              Walrus
            </a>{' '}
            · vibeguardai.xyz
          </span>
        </div>
      </div>
    </footer>
  );
}
