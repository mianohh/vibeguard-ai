import { cn } from './cn';

export type PillTone = 'safe' | 'warn' | 'danger' | 'neutral' | 'brand';

const toneClass: Record<PillTone, string> = {
  safe: 'bg-safe-soft text-safe border-safe-line',
  warn: 'bg-warn-soft text-warn border-warn-line',
  danger: 'bg-danger-soft text-danger border-danger-line',
  neutral: 'bg-surface-2 text-mid border-line',
  brand: 'bg-sui/10 text-sui border-sui/35',
};

export function levelTone(level?: string): PillTone {
  const s = (level || '').toUpperCase();
  if (s.includes('RED') || s.includes('CRITICAL') || s.includes('HIGH') || s.includes('DANGER') || s.includes('MALICIOUS') || s.includes('UNREACHABLE') || s.includes('NOT_CONFIGURED') || s.includes('MISCONFIGURED') || s.includes('DOWN')) return 'danger';
  if (s.includes('YELLOW') || s.includes('MEDIUM') || s.includes('WARN') || s.includes('CAUTION') || s.includes('DEGRADED')) return 'warn';
  if (s.includes('GREEN') || s.includes('SAFE') || s.includes('LOW') || s.includes('VERIFIED') || s.includes('OPERATIONAL')) return 'safe';
  return 'neutral';
}

export const severityTone = levelTone;

export function toneTextClass(tone: PillTone): string {
  const map: Record<PillTone, string> = {
    safe: 'text-safe',
    warn: 'text-warn',
    danger: 'text-danger',
    neutral: 'text-mid',
    brand: 'text-sui',
  };
  return map[tone];
}

export default function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] rounded-full border',
        toneClass[tone ?? levelTone(label)],
        className
      )}
    >
      {label}
    </span>
  );
}
