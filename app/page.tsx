'use client';

import { useState } from 'react';
import { SuiNetwork, AnalysisResult, ApiError } from '@/types';
import { SecurityAnalysis } from './components/SecurityAnalysis';
import { ErrorDisplay } from './components/ErrorDisplay';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Hero from './components/home/Hero';
import TechStack from './components/home/TechStack';
import Features from './components/home/Features';

export default function SecurityConsole() {
  const [transactionBytes, setTransactionBytes] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [network, setNetwork] = useState<SuiNetwork>('testnet');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const handleAnalyze = async () => {
    if (!transactionBytes.trim()) {
      setError({ error: 'Transaction input required' });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBytes: transactionBytes.trim(),
          network,
          userAddress: userAddress.trim() || undefined,
          userIntent: userIntent.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError({
        error: 'Network error occurred',
        details: 'Please check your connection and try again'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />

      <Hero />
      <TechStack />

      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-16 max-w-5xl">
        <AnalyticsDashboard />

        <div className="glass-card p-4 sm:p-6 lg:p-8 mb-8 lg:mb-16 liquid-expand">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-lightsky mb-3 tracking-wide">
                TRANSACTION HASH OR BYTES
              </label>
              <textarea
                value={transactionBytes}
                onChange={(e) => setTransactionBytes(e.target.value)}
                placeholder="Paste Transaction Hash (0x...) or Base64 Bytes"
                className="w-full h-32 px-4 py-4 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200 resize-none"
                disabled={loading}
              />
              <p className="text-xs text-lightblue mt-2 leading-relaxed">
                Use base64 transaction bytes from your wallet BEFORE signing. Transaction hashes from explorers won&apos;t work.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-lightsky mb-3 tracking-wide">
                YOUR ADDRESS (RECOMMENDED)
              </label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x... (optional but improves risk detection accuracy)"
                className="w-full px-4 py-3 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200"
                disabled={loading}
              />
              <p className="text-xs text-lightblue mt-2 leading-relaxed">
                Providing your address enables accurate detection of asset outflows and improves risk analysis
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-lightsky mb-3 tracking-wide">
                WHAT DO YOU THINK THIS TRANSACTION DOES?
              </label>
              <input
                type="text"
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                placeholder="e.g., 'Claim airdrop', 'Mint NFT', 'Swap tokens', 'Send 10 SUI to friend'"
                className="w-full px-4 py-3 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200"
                disabled={loading}
              />
              <p className="text-xs text-lightblue mt-2 leading-relaxed">
                Helps detect scams by comparing your expectation vs. what actually happens
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-lightsky mb-3 tracking-wide">
                NETWORK
              </label>
              <div className="flex space-x-1 bg-ocean-mid/50 p-1 rounded-lg border border-ocean-surface w-fit">
                {(['testnet', 'mainnet', 'devnet'] as SuiNetwork[]).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    disabled={loading}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      network === net
                        ? 'bg-sui-blue text-ocean-deepest shadow-sui-glow'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-ocean-surface/50'
                    }`}
                  >
                    {net.charAt(0).toUpperCase() + net.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !transactionBytes.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {transactionBytes.trim().startsWith('0x')
                        ? 'Fetching Transaction Data...'
                        : 'Analyzing Transaction...'}
                    </span>
                  </div>
                ) : (
                  'Analyze Transaction'
                )}
              </span>
            </button>
          </div>
        </div>

        {error && <ErrorDisplay error={error.error} details={error.details} />}
        {result && <SecurityAnalysis result={result} />}
      </div>

      <Features />
    </div>
  );
}
