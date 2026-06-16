import type { Metadata } from 'next';
import './globals.css';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { initializeIndexer } from '@/lib/threat-indexer';

export const metadata: Metadata = {
  title: 'VibeGuard AI - Eliminate Blind Signing on Sui',
  description: 'Pre-transaction security layer for the Sui blockchain',
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
        <Header />
        <main className="pt-14 lg:pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
