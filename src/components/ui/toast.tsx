'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  tone?: 'neutral' | 'success' | 'error';
  action?: ToastAction;
  durationMs?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

const ToastContext = createContext<{ showToast: (options: ToastOptions) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.action ? 7000 : 3500));
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px_+_env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-raised',
              toast.tone === 'error'
                ? 'bg-error text-white'
                : toast.tone === 'success'
                  ? 'bg-success text-white'
                  : 'bg-ink text-white'
            )}
          >
            <span className="min-w-0">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="min-h-[40px] shrink-0 rounded px-2 font-semibold text-gold underline-offset-2 hover:underline"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): { showToast: (options: ToastOptions) => void } {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
