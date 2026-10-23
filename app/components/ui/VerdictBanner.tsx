import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { cn, } from './cn';
import { levelTone, type PillTone } from './StatusPill';

const toneStyle: Record<'safe' | 'warn' | 'danger', { box: string; ring: string; title: string; Icon: typeof CircleCheck }> = {
  safe: {
    box: 'bg-safe-soft border-safe-line',
    ring: 'bg-safe/15 text-safe',
    title: 'text-[#bbf7d0]',
    Icon: CircleCheck,
  },
  warn: {
    box: 'bg-warn-soft border-warn-line',
    ring: 'bg-warn/15 text-warn',
    title: 'text-[#fef08a]',
    Icon: TriangleAlert,
  },
  danger: {
    box: 'bg-danger-soft border-danger-line',
    ring: 'bg-danger/15 text-danger',
    title: 'text-[#fecaca]',
    Icon: CircleAlert,
  },
};

function toStyle(tone?: PillTone): (typeof toneStyle)['safe'] {
  if (tone === 'safe') return toneStyle.safe;
  if (tone === 'warn') return toneStyle.warn;
  return toneStyle.danger;
}

export default function VerdictBanner({
  headline,
  body,
  tone,
  meta,
  level,
  className,
}: {
  headline: string;
  body?: React.ReactNode;
  tone?: PillTone;
  meta?: React.ReactNode;
  level?: string;
  className?: string;
}) {
  const t = toStyle(tone ?? levelTone(level));
  const Icon = t.Icon;
  const blocking = (tone ?? levelTone(level)) === 'danger';
  return (
    <div
      role={blocking ? 'alert' : 'status'}
      className={cn('flex gap-4 items-start rounded-[var(--radius-card)] border p-5', t.box, className)}
    >
      <span className={cn('grid place-items-center w-11 h-11 rounded-full flex-shrink-0', t.ring)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <h4 className={cn('text-[16px] font-bold tracking-tight', t.title)}>{headline}</h4>
        {body && <div className="mt-1 text-sm text-mid leading-relaxed">{body}</div>}
        {meta && <div className="mt-2.5 font-mono text-[11px] tracking-[0.06em] text-low uppercase">{meta}</div>}
      </div>
    </div>
  );
}
