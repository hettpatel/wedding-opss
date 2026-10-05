'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-crimson text-white hover:bg-crimson-dark',
        secondary: 'border border-crimson/30 bg-white text-crimson hover:bg-crimson/5',
        quiet: 'border border-hairline bg-white text-ink hover:bg-surface',
        ghost: 'text-crimson hover:bg-crimson/5',
        danger: 'bg-error text-white hover:brightness-95',
      },
      size: {
        md: 'min-h-touch px-4 text-[15px]',
        sm: 'min-h-[40px] px-3 text-sm',
        icon: 'h-12 w-12 min-w-touch',
        block: 'min-h-touch w-full px-4 text-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  /** Shows a spinner and blocks repeat taps while an action is running. */
  pending?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, pending = false, disabled, children, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
