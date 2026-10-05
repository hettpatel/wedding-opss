'use client';

import { ImagePlus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { acceptAttribute } from '@/lib/files/validate';
import { saveTemplateFile } from '../lib/template-service';

export function TemplateUpload({ compact = false }: { compact?: boolean }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    setError(null);
    const result = await saveTemplateFile(file);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast({ message: 'Invitation card saved on this phone', tone: 'success' });
  };

  return (
    <div className="space-y-2">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute('invitationTemplate')}
        className="sr-only"
        aria-label="Choose an invitation card file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handle(file);
        }}
      />

      {compact ? (
        <Button variant="quiet" size="block" pending={busy} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" aria-hidden />
          Replace the card
        </Button>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handle(file);
          }}
          className={`rounded-card border-2 border-dashed p-6 text-center ${
            dragging ? 'border-crimson bg-crimson/5' : 'border-hairline bg-white'
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-crimson" aria-hidden />
          <p className="mt-2 text-sm font-medium">Add your invitation card</p>
          <p className="mt-1 text-sm text-muted">
            A PNG or JPG picture of the card, or a one-page PDF. Up to 12 MB.
          </p>
          <div className="mt-3">
            <Button variant="secondary" pending={busy} onClick={() => inputRef.current?.click()}>
              Choose the file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
