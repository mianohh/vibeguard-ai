import { RiskLevel } from '@/types';

interface RiskStatusProps {
  riskLevel: RiskLevel;
  confidence: number;
}

export function RiskStatus({ riskLevel, confidence }: RiskStatusProps) {
  const riskConfig = {
    GREEN: {
      label: 'SAFE',
      icon: '🛡️',
      bgClass: 'bg-emerald-900/30 border-emerald-800/50',
      textClass: 'text-emerald-400',
      glowClass: 'shadow-emerald-900/20'
    },
    YELLOW: {
      label: 'CAUTION',
      icon: '⚠️',
      bgClass: 'bg-amber-900/30 border-amber-800/50',
      textClass: 'text-amber-400',
      glowClass: 'shadow-amber-900/20'
    },
    RED: {
      label: 'DANGEROUS',
      icon: '🚨',
      bgClass: 'bg-red-900/30 border-red-800/50',
      textClass: 'text-red-400',
      glowClass: 'shadow-red-900/20'
    }
  };

  const config = riskConfig[riskLevel];
  const confidenceText = confidence >= 0.9 ? 'High confidence' : 
                        confidence >= 0.7 ? 'Moderate confidence' : 
                        'Low confidence';

  return (
    <div className={`
      relative p-8 rounded-2xl border-2 backdrop-blur-sm
      ${config.bgClass} ${config.glowClass}
      shadow-2xl
    `}>
      <div className="flex items-center justify-center space-x-4">
        <span className="text-3xl">{config.icon}</span>
        <div className="text-center">
          <div className={`text-2xl font-bold tracking-wide ${config.textClass}`}>
            {config.label}
          </div>
          <div className="text-sm text-slate-400 mt-1 font-medium">
            {confidenceText}
          </div>
        </div>
      </div>
    </div>
  );
}