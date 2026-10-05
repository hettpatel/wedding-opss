import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  href,
  tone = 'neutral',
  caption,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  tone?: 'neutral' | 'crimson' | 'warning' | 'error' | 'success';
  caption?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'text-ink',
    crimson: 'text-crimson',
    warning: 'text-warning',
    error: 'text-error',
    success: 'text-success',
  };

  const content = (
    <>
      <span className={cn('block text-2xl font-semibold tabular-nums', tones[tone])}>{value}</span>
      <span className="mt-0.5 block text-sm text-muted">{label}</span>
      {caption ? <span className="mt-1 block text-xs text-muted">{caption}</span> : null}
    </>
  );

  if (!href) {
    return <div className="app-card p-4">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="app-card block p-4 transition-colors hover:border-crimson/40 focus-visible:border-crimson"
    >
      {content}
    </Link>
  );
}
