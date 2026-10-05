'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void import('@/lib/db/repositories')
      .then(({ logAppError }) => logAppError('app', error.message, error.stack))
      .catch(() => undefined);
  }, [error]);

  return (
    <div className="app-card space-y-3 p-5">
      <h2 className="text-base font-semibold text-error">Something went wrong on this screen</h2>
      <p className="text-sm text-muted">
        Nothing was deleted. Everything you saved is still on this phone. Try again, and if it keeps
        happening, export a backup from the More menu.
      </p>
      <p className="rounded bg-surface px-3 py-2 font-mono text-xs text-muted">{error.message}</p>
      <Button size="block" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
