import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeGuard AI - Eliminate Blind Signing on Sui',
  description: 'Pre-transaction security layer for the Sui blockchain',
};

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