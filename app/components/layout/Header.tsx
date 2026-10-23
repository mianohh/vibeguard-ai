'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Demo', href: '/demo' },
  { label: 'Report', href: '/report' },
  { label: 'API Docs', href: '/api-docs' },
  { label: 'Status', href: '/status' },
];

function BrandMark() {
  return (
    <Image
      src="/vibeguard-icon.png"
      alt=""
      width={26}
      height={26}
      className="w-[26px] h-[26px] block"
      priority
      aria-hidden
    />
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY >= 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-200 ${
        sticky
          ? 'bg-canvas/85 backdrop-blur-md border-b border-line-soft'
          : 'border-b border-transparent'
      }`}
    >
      <div className="shell flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 text-hi font-bold text-[17px] tracking-[-0.01em]">
          <BrandMark />
          VibeGuard
          <span className="hidden sm:inline font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sui border border-sui/30 bg-sui/10 rounded-full px-2 py-0.5">
            Sui
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 ${
                  active ? 'text-sui bg-sui/10' : 'text-low hover:text-hi hover:bg-surface-2'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/report"
            className="hidden md:inline-flex items-center gap-2 bg-sui text-ink text-[13.5px] font-semibold px-4 py-2 rounded-[var(--radius-ctl)] shadow-glow hover:bg-[#5cadff] transition-all"
          >
            Report a scam
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-[var(--radius-ctl)] hover:bg-surface-2 text-hi transition-colors cursor-pointer"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" strokeWidth={1.75} /> : <Menu className="w-5 h-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-surface-1 border-l border-line shadow-pop transform transition-transform duration-300 z-50 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-2.5 text-hi font-bold">
            <BrandMark />
            VibeGuard
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-2 hover:bg-surface-2 rounded-[var(--radius-ctl)] text-mid cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
        <nav className="flex flex-col p-3 gap-1">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-[var(--radius-ctl)] text-sm font-medium transition-colors ${
                  active ? 'text-sui bg-sui/10' : 'text-mid hover:text-hi hover:bg-surface-2'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/report"
            onClick={() => setOpen(false)}
            className="mt-2 mx-1 bg-sui text-ink text-center text-sm font-semibold px-4 py-3 rounded-[var(--radius-ctl)] shadow-glow"
          >
            Report a scam
          </Link>
        </nav>
      </div>
    </header>
  );
}
