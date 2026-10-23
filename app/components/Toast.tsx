'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  details?: string;
  onClose: () => void;
}

export default function Toast({ message, type, details, onClose }: ToastProps) {
  const success = type === 'success';
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[10000] max-w-sm surface rounded-[var(--radius-tile)] overflow-hidden animate-fade-up"
      style={{ borderLeftWidth: 3, borderLeftColor: success ? 'var(--color-safe)' : 'var(--color-danger)' }}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={`grid place-items-center w-7 h-7 rounded-full flex-shrink-0 ${
            success ? 'bg-safe-soft text-safe' : 'bg-danger-soft text-danger'
          }`}
        >
          {success ? <CircleCheck className="w-4 h-4" strokeWidth={1.75} /> : <CircleAlert className="w-4 h-4" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-hi">{message}</p>
          {details && <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-low whitespace-pre-line break-all">{details}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="text-faint hover:text-hi transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
