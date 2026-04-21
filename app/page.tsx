'use client';

import { useState } from 'react';
import { SuiNetwork, AnalysisResult, ApiError } from '@/types';
import { SecurityAnalysis } from './components/SecurityAnalysis';
import { ErrorDisplay } from './components/ErrorDisplay';
import AnalyticsDashboard from './components/AnalyticsDashboard';

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
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="sui-symbol w-12 h-12" />
            <h1 className="text-5xl font-display font-bold">
              <span className="gradient-text">VibeGuard AI</span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 font-medium">
            Eliminate blind signing on Sui
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            Analyze real Sui transactions before you sign them
          </p>
          
          {/* Navigation Tabs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a 
              href="/demo"
              className="glass-card px-6 py-3 hover:border-sui-aqua transition-all duration-200 group"
            >
              <span className="text-sui-aqua group-hover:text-sui-cyan font-semibold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Live Demo
              </span>
            </a>
            <a 
              href="/report"
              className="glass-card px-6 py-3 hover:border-status-danger transition-all duration-200 group"
            >
              <span className="text-status-danger group-hover:text-red-300 font-semibold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Report Malicious Contract
              </span>
            </a>
            <a 
              href="/ecosystem"
              className="glass-card px-6 py-3 hover:border-status-safe transition-all duration-200 group"
            >
              <span className="text-status-safe group-hover:text-green-300 font-semibold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                Ecosystem Primitives
              </span>
            </a>
            <a 
              href="/api-docs"
              className="glass-card px-6 py-3 hover:border-sui-cyan transition-all duration-200 group"
            >
              <span className="text-sui-cyan group-hover:text-sui-aqua font-semibold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                API Documentation
              </span>
            </a>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

        {/* Input Console */}
        <div className="glass-card p-8 mb-12 liquid-expand">
          <div className="space-y-8">
            
            {/* Transaction Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                TRANSACTION HASH OR BYTES
              </label>
              <textarea
                value={transactionBytes}
                onChange={(e) => setTransactionBytes(e.target.value)}
                placeholder="Paste Transaction Hash (0x...) or Base64 Bytes"
                className="
                  w-full h-32 px-4 py-4 
                  bg-ocean-mid/50 border border-ocean-surface rounded-lg 
                  text-gray-200 placeholder-gray-500
                  font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan
                  transition-all duration-200
                  resize-none
                "
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Use base64 transaction bytes from your wallet BEFORE signing. Transaction hashes from explorers won't work.
              </p>
            </div>

            {/* User Address Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                YOUR ADDRESS (RECOMMENDED)
              </label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x... (optional but improves risk detection accuracy)"
                className="
                  w-full px-4 py-3 
                  bg-ocean-mid/50 border border-ocean-surface rounded-lg 
                  text-gray-200 placeholder-gray-500
                  font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan
                  transition-all duration-200
                "
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Providing your address enables accurate detection of asset outflows and improves risk analysis
              </p>
            </div>

            {/* User Intent Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                WHAT DO YOU THINK THIS TRANSACTION DOES?
              </label>
              <input
                type="text"
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                placeholder="e.g., 'Claim airdrop', 'Mint NFT', 'Swap tokens', 'Send 10 SUI to friend'"
                className="
                  w-full px-4 py-3 
                  bg-ocean-mid/50 border border-ocean-surface rounded-lg 
                  text-gray-200 placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan
                  transition-all duration-200
                "
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Helps detect scams by comparing your expectation vs. what actually happens
              </p>
            </div>

            {/* Network Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                NETWORK
              </label>
              <div className="flex space-x-1 bg-ocean-mid/50 p-1 rounded-lg border border-ocean-surface w-fit">
                {(['testnet', 'mainnet', 'devnet'] as SuiNetwork[]).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    disabled={loading}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${network === net 
                        ? 'bg-sui-blue text-ocean-deepest shadow-sui-glow' 
                        : 'text-gray-400 hover:text-gray-300 hover:bg-ocean-surface/50'
                      }
                    `}
                  >
                    {net.charAt(0).toUpperCase() + net.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !transactionBytes.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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

        {/* Results */}
        {error && <ErrorDisplay error={error.error} details={error.details} />}
        {result && <SecurityAnalysis result={result} />}

      </div>
    </div>
  );
}