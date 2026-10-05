'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Only appears when the browser actually offers installation. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="app-card flex items-center gap-3 border-gold/60 bg-gold/5 p-3">
      <Download className="h-5 w-5 shrink-0 text-crimson" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Add Wedding Ops to your home screen</p>
        <p className="text-xs text-muted">It then opens like a normal app and works without internet.</p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Install
      </Button>
      <button
        type="button"
        aria-label="Hide install suggestion"
        className="min-h-touch min-w-touch text-muted"
        onClick={() => setDismissed(true)}
      >
        <X className="mx-auto h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
