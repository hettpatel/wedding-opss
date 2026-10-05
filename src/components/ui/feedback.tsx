import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const badgeStyles = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface text-muted border border-hairline',
      crimson: 'bg-crimson/10 text-crimson',
      gold: 'border border-gold bg-gold/10 text-[#7A5E12]',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({
  className,
  tone,
  children,
}: VariantProps<typeof badgeStyles> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeStyles({ tone }), className)}>{children}</span>;
}

export function Chip({
  active = false,
  onClick,
  children,
  ariaLabel,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        'min-h-[40px] whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors',
        active
          ? 'border-gold bg-gold/15 text-crimson'
          : 'border-hairline bg-white text-muted hover:border-crimson/30 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="app-card flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon ? <div className="text-crimson/70">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

export function InlineNotice({
  tone = 'warning',
  children,
}: {
  tone?: 'warning' | 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    warning: 'border-warning/40 bg-warning/5 text-warning',
    error: 'border-error/40 bg-error/5 text-error',
    success: 'border-success/40 bg-success/5 text-success',
    info: 'border-hairline bg-surface text-muted',
  };
  return (
    <div className={cn('rounded-lg border px-3 py-2 text-sm', tones[tone])} role="status">
      {children}
    </div>
  );
}
