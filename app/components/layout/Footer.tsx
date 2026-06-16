'use client';

import Link from 'next/link';

const footerLinks = [
  { label: 'Home', href: '/' },
  { label: 'Demo', href: '/demo' },
  { label: 'Report Threat', href: '/report' },
  { label: 'API Docs', href: '/api-docs' },
  { label: 'Status', href: '/status' },
];

const techStack = [
  { name: 'Sui Network', color: 'text-sui-blue' },
  { name: 'Walrus Protocol', color: 'text-sui-cyan' },
  { name: 'AWS Nitro Enclaves', color: 'text-status-warning' },
];

export default function Footer() {
  return (
    <footer className="bg-body-bg relative border-t border-border">
      <div className="bg-linear-to-r from-primary/20 to-secondary/20 hidden lg:block absolute w-full h-full top-0 -left-1/2 blur-390" />

      <div className="container relative z-10 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="sui-symbol w-8 h-8" />
              <span className="text-xl font-bold text-white font-display">VibeGuard AI</span>
            </div>
            <p className="text-lightblue text-sm font-normal max-w-96 leading-6 mb-5">
              Pre-transaction security layer for the Sui blockchain. Eliminate blind signing
              with AI-powered threat detection, enclave-verified analysis, and decentralized
              evidence storage.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/mianohh/vibeguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white text-sm font-semibold rounded-lg transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/vibeguard-sui-security"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-ocean-mid border border-border flex items-center justify-center hover:border-primary transition-colors"
                aria-label="npm"
              >
                <svg className="w-5 h-5 text-lightblue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l5.771.084v13.52h3.912V5.407l5.78-.102v13.434h3.482V3.59H9.182l-.036.108v14.443H5.13z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-white text-lg font-medium mb-4">Quick Links</p>
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href} className="mb-3">
                  <Link
                    href={link.href}
                    className="text-lightblue text-sm font-normal hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-white text-lg font-medium mb-4">Secured By</p>
            <ul className="space-y-3">
              {techStack.map((tech) => (
                <li key={tech.name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-current ${tech.color}`} />
                  <span className="text-lightblue text-sm">{tech.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="py-4 px-4 border-t border-border">
        <p className="text-center text-lightblue text-sm">
          &copy; {new Date().getFullYear()} VibeGuard AI. Built on{' '}
          <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className="text-sui-cyan hover:text-sui-aqua transition-colors">
            Sui Network
          </a>
          {' '}with{' '}
          <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className="text-sui-cyan hover:text-sui-aqua transition-colors">
            Walrus Protocol
          </a>
        </p>
      </div>
    </footer>
  );
}
