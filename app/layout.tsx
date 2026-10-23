import type { Metadata } from 'next';
import './globals.css';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { initializeIndexer } from '@/lib/threat-indexer';

export const metadata: Metadata = {
  metadataBase: new URL('https://vibeguardai.xyz'),
  title: 'VibeGuard AI - Pre-transaction analysis for Sui',
  description:
    'Simulate any Sui transaction, review its effects and risk indicators, and get a signed verifiable analysis record.',
  openGraph: {
    title: 'VibeGuard AI: Pre-transaction analysis for Sui',
    description: 'Simulate, review, and verify every Sui transaction before you sign.',
    url: 'https://vibeguardai.xyz',
    siteName: 'VibeGuard AI',
    type: 'website',
    images: ['/vibeguard-icon.png'],
  },
};

if (typeof window === 'undefined') {
  initializeIndexer().catch(console.error);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        <div aria-hidden className="fixed inset-0 -z-10 bg-wash pointer-events-none" />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="pt-16 flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
