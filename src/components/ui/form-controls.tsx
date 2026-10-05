'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const controlStyles =
  'w-full rounded-lg border border-hairline bg-white px-3 py-3 text-ink placeholder:text-muted/70 focus:border-crimson focus:outline-none';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  highlight = false,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  /** Gold outline marks a value the parser was unsure about. */
  highlight?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className={cn(highlight && 'rounded-lg ring-2 ring-gold ring-offset-1')}>{children}</div>
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlStyles, className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(controlStyles, 'leading-relaxed', className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlStyles, 'min-h-touch appearance-none pr-8', className)} {...props}>
        {children}
      </select>
    );
  }
);
