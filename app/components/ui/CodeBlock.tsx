'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from './cn';

export default function CodeBlock({
  code,
  title,
  copyable = true,
  className,
}: {
  code: string;
  title?: string;
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={cn('bg-[#06080d] border border-line rounded-[var(--radius-tile)] overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0f16] border-b border-line">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </span>
          {title && <span className="ml-2 font-mono text-[11.5px] text-faint">{title}</span>}
        </div>
        {copyable && (
          <button
            onClick={copy}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-low hover:text-sui transition-colors cursor-pointer"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] leading-relaxed text-mid">
        <code>{code}</code>
      </pre>
    </div>
  );
}
