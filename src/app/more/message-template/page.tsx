'use client';

import { Copy, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Chip, InlineNotice } from '@/components/ui/feedback';
import { Field, Select, Textarea } from '@/components/ui/form-controls';
import { useToast } from '@/components/ui/toast';
import { useWeddingSettings } from '@/hooks/use-app-data';
import { useGuests } from '@/features/guests/hooks/use-guests';
import { useMessageTemplate } from '@/features/invitations/hooks/use-invitations';
import { buildMergeValues, SAMPLE_MERGE_VALUES } from '@/features/invitations/lib/message-values';
import { repositories } from '@/lib/db/repositories';
import {
  DEFAULT_MESSAGE_TEMPLATE,
  findEmptyTagValues,
  findUnknownTags,
  MERGE_TAGS,
  renderMessage,
} from '@/lib/message/merge';
import { copyText } from '@/lib/share/share-capabilities';

export default function MessageTemplatePage() {
  const stored = useMessageTemplate();
  const wedding = useWeddingSettings();
  const guests = useGuests();
  const { showToast } = useToast();

  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewGuestId, setPreviewGuestId] = useState('');

  useEffect(() => {
    if (stored && !dirty) setBody(stored.body);
  }, [dirty, stored]);

  const previewGuest = useMemo(() => {
    const list = guests ?? [];
    return list.find((guest) => guest.id === previewGuestId) ?? list[0] ?? null;
  }, [guests, previewGuestId]);

  const values = useMemo(
    () =>
      previewGuest
        ? buildMergeValues(previewGuest, wedding ?? null)
        : { ...SAMPLE_MERGE_VALUES, eventDates: wedding?.eventDates || SAMPLE_MERGE_VALUES.eventDates, venue: wedding?.venueName || SAMPLE_MERGE_VALUES.venue, mapLink: wedding?.mapLink || SAMPLE_MERGE_VALUES.mapLink },
    [previewGuest, wedding]
  );

  const unknownTags = useMemo(() => findUnknownTags(body), [body]);
  const emptyTags = useMemo(() => findEmptyTagValues(body, values), [body, values]);
  const preview = useMemo(() => renderMessage(body, values), [body, values]);

  const insertTag = (tag: string) => {
    setDirty(true);
    setBody((current) => (current.endsWith(' ') || current === '' ? `${current}${tag}` : `${current} ${tag}`));
  };

  const save = async () => {
    if (!stored) return;
    setSaving(true);
    await repositories.messageTemplates.update(stored.id, { body: body.trim() });
    setSaving(false);
    setDirty(false);
    showToast({ message: 'Message saved on this phone', tone: 'success' });
  };

  if (stored === undefined) {
    return <p className="py-10 text-center text-sm text-muted">Loading your message…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Invitation message"
          description="This text goes with every personal invitation you send."
        />
        <div className="space-y-4 p-4">
          <Field label="Message" htmlFor="message-body">
            <Textarea
              id="message-body"
              rows={7}
              value={body}
              onChange={(event) => {
                setDirty(true);
                setBody(event.target.value);
              }}
            />
          </Field>

          <div>
            <p className="mb-2 text-sm text-muted">
              Tap to add a tag. Each one is replaced with the guest&apos;s own details.
            </p>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map((tag) => (
                <Chip key={tag} onClick={() => insertTag(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
          </div>

          {unknownTags.length > 0 ? (
            <InlineNotice tone="error">
              {unknownTags.join(', ')} {unknownTags.length === 1 ? 'is not a tag' : 'are not tags'} the
              app knows. It will be sent exactly as written. Use only the tags above.
            </InlineNotice>
          ) : null}

          {emptyTags.length > 0 ? (
            <InlineNotice tone="warning">
              {emptyTags.join(', ')} {emptyTags.length === 1 ? 'has' : 'have'} nothing saved yet, so{' '}
              {emptyTags.length === 1 ? 'it' : 'they'} will come out blank.{' '}
              <Link href="/more/settings" className="font-semibold underline">
                Fill this in under Settings
              </Link>
            </InlineNotice>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="quiet"
              size="block"
              onClick={() => {
                setDirty(true);
                setBody(DEFAULT_MESSAGE_TEMPLATE);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset
            </Button>
            <Button
              size="block"
              pending={saving}
              disabled={!dirty || body.trim() === ''}
              onClick={() => void save()}
            >
              Save message
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Preview" description="Exactly what the guest will read." />
        <div className="space-y-3 p-4">
          {guests && guests.length > 0 ? (
            <Field label="Preview with" htmlFor="preview-guest">
              <Select
                id="preview-guest"
                value={previewGuest?.id ?? ''}
                onChange={(event) => setPreviewGuestId(event.target.value)}
              >
                {guests.slice(0, 100).map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.primaryGuestName}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="text-sm text-muted">
              No guests saved yet, so this preview uses an example household.
            </p>
          )}

          <p className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface px-3 py-3 text-sm leading-relaxed">
            {preview || 'Write a message above to see it here.'}
          </p>

          <Button
            variant="quiet"
            size="block"
            onClick={async () => {
              const copied = await copyText(preview);
              showToast({
                message: copied ? 'Message copied' : 'Copying is blocked here. Select the text and copy it by hand.',
                tone: copied ? 'success' : 'error',
              });
            }}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy this message
          </Button>
        </div>
      </Card>
    </div>
  );
}
