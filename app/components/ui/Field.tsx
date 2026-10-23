import type { ReactNode } from 'react';
import { cn } from './cn';

export const inputClass =
  'w-full bg-[#070c16] border border-line rounded-[var(--radius-ctl)] text-hi placeholder:text-faint font-mono text-[13px] px-3.5 py-3 transition-colors focus:outline-none focus:border-sui/60 focus:ring-2 focus:ring-sui/25 disabled:opacity-50 disabled:cursor-not-allowed';

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-low mb-2.5">
        {label}
        {required && <span className="text-sui ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-xs text-faint">{hint}</p>
      )}
    </div>
  );
}
