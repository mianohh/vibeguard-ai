'use client';

import { useState } from 'react';
import { ShieldCheck, AlertTriangle, Skull, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface AnalysisResult {
  summary: string;
  riskScore: 'SAFE' | 'CAUTION' | 'DANGER';
  reasoning: string;
}

interface ApiResponse {
  success: boolean;
  analysis: AnalysisResult;
  transactionData?: any;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const analyzeTransaction = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Determine if input is digest (short hash) or transaction block (long base64)
      const isDigest = input.length < 100 && !input.includes('=');
      const payload = isDigest ? { digest: input.trim() } : { transactionBlock: input.trim() };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to analyze transaction');
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (riskScore: string) => {
    switch (riskScore) {
      case 'SAFE':
        return <ShieldCheck className="w-12 h-12 text-emerald-400" />;
      case 'CAUTION':
        return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
      case 'DANGER':
        return <Skull className="w-12 h-12 text-rose-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
    }
  };

  const getRiskText = (riskScore: string) => {
    switch (riskScore) {
      case 'SAFE':
        return 'SAFE TO SIGN';
      case 'CAUTION':
        return 'PROCEED WITH CAUTION';
      case 'DANGER':
        return 'HIGH RISK DETECTED';
      default:
        return 'UNKNOWN RISK';
    }
  };

  const getRiskColor = (riskScore: string) => {
    switch (riskScore) {
      case 'SAFE':
        return 'text-emerald-400';
      case 'CAUTION':
        return 'text-yellow-400';
      case 'DANGER':
        return 'text-rose-500';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 pt-12">
          <h1 className="text-6xl font-bold text-white mb-4">VibeGuard AI</h1>
          <p className="text-xl text-slate-300">
            Eliminate Blind Signing on Sui. Know exactly what you are signing.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your transaction data here..."
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={analyzeTransaction}
            disabled={loading || !input.trim()}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              'Analyze Transaction'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-900/50 border border-rose-800 rounded-lg p-4 mb-8">
            <p className="text-rose-400">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                {getRiskIcon(result.analysis.riskScore)}
                <h2 className={`text-2xl font-bold ${getRiskColor(result.analysis.riskScore)}`}>
                  {getRiskText(result.analysis.riskScore)}
                </h2>
              </div>
            </div>

            {/* Human Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">What This Transaction Does:</h3>
              <p className="text-xl text-slate-200 mb-4">{result.analysis.summary}</p>
              <p className="text-slate-400">{result.analysis.reasoning}</p>
            </div>

            {/* Technical Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                View Technical Details
              </button>
              
              {showDetails && (
                <div className="mt-4 bg-slate-800 rounded-lg p-4 overflow-auto">
                  <pre className="text-sm text-slate-300">
                    {JSON.stringify(result.transactionData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}