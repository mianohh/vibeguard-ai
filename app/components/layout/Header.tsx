'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Demo', href: '/demo' },
  { label: 'Report', href: '/report' },
  { label: 'Ecosystem', href: '/ecosystem' },
  { label: 'API Docs', href: '/api-docs' },
  { label: 'Status', href: '/status' },
];

export default function Header() {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setSticky(window.scrollY >= 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navbarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [navbarOpen]);

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        sticky
          ? 'bg-body-bg/90 backdrop-blur-md shadow-lg border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between py-3 lg:py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="sui-symbol w-7 h-7 lg:w-8 lg:h-8" />
          <span className="text-lg lg:text-xl font-bold text-white font-display">VibeGuard</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-lightblue hover:text-white text-xs lg:text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setNavbarOpen(!navbarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-ocean-mid transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {navbarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {navbarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setNavbarOpen(false)} />
      )}

      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-64 bg-darkmode shadow-lg transform transition-transform duration-300 z-50 ${
          navbarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="sui-symbol w-6 h-6" />
            <span className="text-lg font-bold text-white">VibeGuard</span>
          </div>
          <button
            onClick={() => setNavbarOpen(false)}
            className="p-2 hover:bg-ocean-mid rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col p-4 gap-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavbarOpen(false)}
              className="px-4 py-3 text-lightblue hover:text-white hover:bg-ocean-mid rounded-lg transition-all text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
