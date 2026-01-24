import { useState } from 'react';
import { AnalysisResult } from '@/types';
import { RiskStatus } from './RiskStatus';

interface SecurityAnalysisProps {
  result: AnalysisResult;
}

export function SecurityAnalysis({ result }: SecurityAnalysisProps) {
  const [showRawData, setShowRawData] = useState(false);

  const getRecommendationStyle = (action: string) => {
    switch (action) {
      case 'Sign':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'Be Careful':
        return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'Do Not Sign':
        return 'bg-red-900/50 text-red-300 border-red-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Risk Status - Hero Element */}
      <div className="flex justify-center">
        <RiskStatus 
          riskLevel={result.risk.riskLevel} 
          confidence={result.risk.confidence} 
        />
      </div>

      {/* Summary Section */}
      <div className="security-surface p-6">
        <h2 className="text-xl font-semibold text-slate-200 mb-4 tracking-tight">
          Summary
        </h2>
        <p className="text-slate-300 leading-relaxed text-base">
          {result.explanation.plainEnglish}
        </p>
      </div>

      {/* Transaction Analysis */}
      {result.explanation.bulletPoints.length > 0 && (
        <div className="security-surface p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 tracking-tight">
            What This Transaction Does
          </h3>
          <ul className="space-y-3">
            {result.explanation.bulletPoints.map((point, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 flex-shrink-0"></div>
                <span className="text-slate-300 text-sm leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Analysis */}
      {result.risk.reasons.length > 0 && (
        <div className="security-surface p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 tracking-tight">
            Risk Analysis
          </h3>
          <ul className="space-y-3">
            {result.risk.reasons.map((reason, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className={`mt-0.5 text-sm ${
                  result.risk.riskLevel === 'RED' ? 'text-red-400' :
                  result.risk.riskLevel === 'YELLOW' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {result.risk.riskLevel === 'RED' ? '●' :
                   result.risk.riskLevel === 'YELLOW' ? '▲' : '✓'}
                </span>
                <span className="text-slate-300 text-sm leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* System Recommendation */}
      <div className="security-surface p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 tracking-tight">
          System Recommendation
        </h3>
        <div className={`
          inline-flex items-center px-4 py-2 rounded-lg border font-medium text-sm
          ${getRecommendationStyle(result.explanation.recommendedAction)}
        `}>
          {result.explanation.recommendedAction}
        </div>
      </div>

      {/* Verification Checklist */}
      {result.explanation.whatToCheck.length > 0 && (
        <div className="security-surface p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 tracking-tight">
            Before Proceeding, Verify
          </h3>
          <ul className="space-y-3">
            {result.explanation.whatToCheck.map((item, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="text-blue-400 mt-0.5 text-sm">□</span>
                <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Data Section */}
      <div className="border-t border-slate-700 pt-8">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
        >
          {showRawData ? '▼' : '▶'} Advanced users can inspect the raw simulation output
        </button>
        
        {showRawData && (
          <div className="mt-4 security-surface-elevated p-4">
            <pre className="monospace-input text-xs text-slate-400 overflow-auto max-h-96">
              {JSON.stringify(result.simulation.rawDryRun, null, 2)}
            </pre>
          </div>
        )}
        
        <p className="text-xs text-slate-500 mt-6 leading-relaxed">
          This analysis is based on an off-chain simulation. Network conditions and contract behavior may change.
        </p>
      </div>
    </div>
  );
}