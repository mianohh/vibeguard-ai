import type { Metadata } from 'next';
import './globals.css';
import { initializeIndexer } from '@/lib/threat-indexer';

export const metadata: Metadata = {
  title: 'VibeGuard AI - Eliminate Blind Signing on Sui',
  description: 'Pre-transaction security layer for the Sui blockchain',
};

// Initialize threat indexer on app startup
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
      <body className="bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}