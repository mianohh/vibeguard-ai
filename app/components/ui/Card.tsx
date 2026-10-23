import { cn } from './cn';

export default function Card({
  children,
  className,
  hover,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <As
      className={cn(
        'surface',
        hover && 'transition-colors duration-200 hover:border-sui/40',
        className
      )}
    >
      {children}
    </As>
  );
}
