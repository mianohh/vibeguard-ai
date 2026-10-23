import { cn } from './cn';

export default function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface rounded-[var(--radius-tile)] px-5 py-[18px]', className)}>
      <div className="font-mono text-[26px] leading-none font-semibold text-hi tracking-tight tabular">
        {value}
      </div>
      <div className="mt-2 text-xs text-low">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}
