import { cn } from './cn';

export default function SectionHeading({
  kicker,
  title,
  lede,
  align = 'left',
  className,
}: {
  kicker?: string;
  title: string;
  lede?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'text-center mx-auto max-w-2xl', className)}>
      {kicker && (
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-sui">
          {kicker}
        </p>
      )}
      <h2 className={cn('mt-3 text-[clamp(28px,4vw,36px)] leading-[1.12] tracking-[-0.025em]', align === 'center' && 'mx-auto')}>
        {title}
      </h2>
      {lede && <p className={cn('mt-3 text-[16.5px] leading-relaxed text-mid', align === 'center' && 'mx-auto')}>{lede}</p>}
    </div>
  );
}
