interface ErrorDisplayProps {
  error: string;
  details?: string;
}

export function ErrorDisplay({ error, details }: ErrorDisplayProps) {
  return (
    <div className="security-surface p-6 border-red-800/50 bg-red-900/10">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center">
            <span className="text-red-400 text-sm">⚠</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-300 mb-2 tracking-tight">
            Analysis Failed
          </h3>
          <p className="text-red-200/90 mb-3 leading-relaxed">
            {error}
          </p>
          {details && (
            <div className="security-surface-elevated p-3 bg-red-900/20">
              <p className="text-sm text-red-300/80 monospace-input">
                {details}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}