'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip, InlineNotice } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form-controls';
import { logAppError } from '@/lib/db/repositories';
import { invitationFileName } from '@/lib/format/filename';
import { generateInvitationPdf, type GeneratedInvitation } from '@/lib/pdf/generate-invitation';
import type { InvitationTemplate } from '@/lib/models';
import { PdfPreview } from './pdf-preview';

const SHORT_NAME = 'Mr. & Mrs. Ramesh Patel';
const LONG_NAME = 'Shri Jashvantbhai Maganbhai Chaudhary & Parivar';

/**
 * Lets the layout be checked against real names before 500 invitations are made from it.
 * Short and very long names are one tap each.
 */
export function NameTestDialog({
  open,
  template,
  longestGuestName,
  onClose,
}: {
  open: boolean;
  template: InvitationTemplate;
  longestGuestName: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(SHORT_NAME);
  const [result, setResult] = useState<GeneratedInvitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(() => {
    const list = [
      { label: 'Short name', value: 'Ramesh Patel' },
      { label: 'Usual name', value: SHORT_NAME },
      { label: 'Very long name', value: LONG_NAME },
    ];
    if (longestGuestName) {
      list.push({ label: 'Longest in your list', value: longestGuestName });
    }
    return list;
  }, [longestGuestName]);

  const build = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await generateInvitationPdf(template, name.trim()));
    } catch (caught) {
      await logAppError('pdf', 'The test invitation could not be created', caught);
      setError('The invitation could not be made. Check the card file and try again.');
      setResult(null);
    }
    setBusy(false);
  }, [name, template]);

  useEffect(() => {
    if (open && !result && !busy && name.trim()) {
      void build();
    }
    if (!open) {
      setResult(null);
      setError(null);
    }
  }, [open, build, result, busy, name]);

  if (!open) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Try a name on the card"
      description="Make a real PDF and look at it before you send anything."
      footer={
        <div className="flex gap-2">
          <Button variant="quiet" size="block" onClick={onClose}>
            Close
          </Button>
          <Button size="block" pending={busy} disabled={!name.trim()} onClick={() => void build()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {result ? 'Make it again' : 'Make the PDF'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Chip
              key={preset.label}
              active={name === preset.value}
              onClick={() => {
                setName(preset.value);
                setResult(null);
              }}
            >
              {preset.label}
            </Chip>
          ))}
        </div>

        <Field label="Name to print" htmlFor="test-name">
          <Input
            id="test-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setResult(null);
            }}
          />
        </Field>

        {result ? (
          <>
            {result.overflowWarning ? (
              <InlineNotice tone="error">{result.overflowWarning}</InlineNotice>
            ) : result.shrunk ? (
              <InlineNotice tone="warning">
                This name was shrunk to {Math.round(result.fit.fontSize)} to fit, over{' '}
                {result.fit.lines.length} line{result.fit.lines.length === 1 ? '' : 's'}.
              </InlineNotice>
            ) : (
              <InlineNotice tone="success">
                Fits at the full size, over {result.fit.lines.length} line
                {result.fit.lines.length === 1 ? '' : 's'}.
              </InlineNotice>
            )}

            {result.fontWarning ? (
              <InlineNotice tone="warning">{result.fontWarning}</InlineNotice>
            ) : null}

            <PdfPreview blob={result.blob} fileName={invitationFileName(name)} />
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
