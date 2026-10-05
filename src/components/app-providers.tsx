'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/error-boundary';
import { ServiceWorkerRegistrar } from '@/components/shell/service-worker';
import { ensureInitialData } from '@/lib/db/seed';
import { requestPersistentStorage } from '@/lib/storage/quota';

/** Creates the default categories and settings before any screen reads the database. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    ensureInitialData()
      .then(() => requestPersistentStorage())
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : String(error));
        setStatus('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-6">
        <p className="text-sm text-muted">Opening your wedding data…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-6">
        <div className="app-card max-w-sm space-y-3 p-5">
          <h1 className="text-base font-semibold text-error">Local storage could not be opened</h1>
          <p className="text-sm text-muted">
            This usually happens in private browsing, or when the browser is blocking storage for
            this site. Open the app in a normal window and allow storage.
          </p>
          <p className="rounded bg-surface px-3 py-2 font-mono text-xs text-muted">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ServiceWorkerRegistrar />
      <ErrorBoundary>{children}</ErrorBoundary>
    </ToastProvider>
  );
}
