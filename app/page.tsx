'use client';

import { useState } from 'react';
import { SuiNetwork, AnalysisResult, ApiError } from '@/types';
import { SecurityAnalysis } from './components/SecurityAnalysis';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function SecurityConsole() {
  const [transactionBytes, setTransactionBytes] = useState('');
  const [userAddress, setUserAddress] = useState('');
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        {/* Header - Minimal & Authoritative */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
            🔐 VibeGuard AI
          </h1>
          <p className="text-xl text-slate-400 font-medium">
            Eliminate blind signing on Sui
          </p>
          <p className="text-slate-500 mt-2 text-sm">
            Analyze real Sui transactions before you sign them
          </p>
        </div>

        {/* Input Console */}
        <div className="security-surface p-8 mb-12">
          <div className="space-y-8">
            
            {/* Transaction Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                TRANSACTION BYTES
              </label>
              <textarea
                value={transactionBytes}
                onChange={(e) => setTransactionBytes(e.target.value)}
                placeholder="Paste base64-encoded transaction blocks from real Sui wallets"
                className="
                  w-full h-32 px-4 py-4 
                  bg-slate-900/50 border border-slate-700 rounded-lg 
                  text-slate-200 placeholder-slate-500
                  monospace-input
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                  transition-all duration-200
                  resize-none
                "
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Only accepts base64-encoded transaction blocks from real Sui wallets
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
                  bg-slate-900/50 border border-slate-700 rounded-lg 
                  text-slate-200 placeholder-slate-500
                  monospace-input
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                  transition-all duration-200
                "
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Providing your address enables accurate detection of asset outflows and improves risk analysis
              </p>
            </div>

            {/* Network Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                NETWORK
              </label>
              <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700 w-fit">
                {(['testnet', 'mainnet', 'devnet'] as SuiNetwork[]).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetwork(net)}
                    disabled={loading}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${network === net 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
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
              className="
                w-full px-8 py-4 
                bg-blue-600 hover:bg-blue-700 
                disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                text-white font-semibold text-base
                rounded-lg border border-blue-500/50
                transition-all duration-200
                shadow-lg shadow-blue-900/20
              "
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analyzing Transaction...</span>
                </div>
              ) : (
                'Analyze Transaction'
              )}
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