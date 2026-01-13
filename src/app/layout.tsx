import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VibeGuard AI',
  description: 'Sui Transaction Security Agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200">{children}</body>
    </html>
  )
}