import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-sui text-ink shadow-glow hover:bg-[#5cadff] active:translate-y-px font-semibold',
  secondary:
    'bg-surface-2 text-hi border border-line hover:border-sui/50 hover:text-sui',
  ghost: 'bg-transparent text-mid hover:text-hi hover:bg-surface-2',
  danger: 'bg-danger-solid text-white hover:bg-[#c81e24] font-semibold',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-4 py-2.5 text-sm rounded-[var(--radius-ctl)]',
  md: 'px-6 py-3.5 text-[15px] rounded-[var(--radius-ctl)]',
  lg: 'px-7 py-4 text-base rounded-[12px]',
};

function classes(variant: Variant, size: Size, full?: boolean, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none disabled:opacity-45 disabled:pointer-events-none',
    variantClass[variant],
    sizeClass[size],
    full && 'w-full',
    className
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={classes(variant, size, full, className)} {...props} />;
}

type ButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  href: string;
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  full,
  className,
  href,
  ...props
}: ButtonLinkProps) {
  return <Link href={href} className={classes(variant, size, full, className)} {...props} />;
}
