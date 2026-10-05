'use client';

import { ChevronDown, ChevronUp, Mail, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Chip, EmptyState, InlineNotice } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form-controls';
import { useAppSettings, useWeddingSettings } from '@/hooks/use-app-data';
import { useGuests } from '@/features/guests/hooks/use-guests';
import { InvitationStatusBadge } from '@/features/guests/components/guest-badges';
import { PlacementEditor } from '@/features/invitations/components/placement-editor';
import { SendDialog } from '@/features/invitations/components/send-dialog';
import { TemplateUpload } from '@/features/invitations/components/template-upload';
import {
  useActiveTemplate,
  useMessageTemplate,
} from '@/features/invitations/hooks/use-invitations';
import { deleteTemplate } from '@/features/invitations/lib/template-service';
import {
  isAwaitingConfirmation,
  isConfirmedSent,
  summariseDispatch,
} from '@/features/invitations/lib/dispatch-rules';
import { formatBytes } from '@/lib/storage/quota';
import type { GuestHousehold } from '@/lib/models';

type Lane = 'to-send' | 'awaiting' | 'sent' | 'all';

const LANES: Array<{ id: Lane; label: string }> = [
  { id: 'to-send', label: 'Still to send' },
  { id: 'awaiting', label: 'Waiting for your answer' },
  { id: 'sent', label: 'Confirmed sent' },
  { id: 'all', label: 'Everyone' },
];

export default function InvitationsPage() {
  const guests = useGuests();
  const template = useActiveTemplate();
  const messageTemplate = useMessageTemplate();
  const wedding = useWeddingSettings();
  const settings = useAppSettings();

  const [lane, setLane] = useState<Lane>('to-send');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<GuestHousehold | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [confirmRemoveTemplate, setConfirmRemoveTemplate] = useState(false);

  const all = useMemo(() => guests ?? [], [guests]);
  const progress = useMemo(() => summariseDispatch(all), [all]);

  // Lets the layout be checked against the hardest real name, not just a sample.
  const longestGuestName = useMemo(() => {
    let longest: string | null = null;
    for (const guest of all) {
      const name = guest.invitationDisplayName || guest.primaryGuestName;
      if (!longest || name.length > longest.length) longest = name;
    }
    return longest;
  }, [all]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((guest) => {
        if (lane === 'to-send') {
          return !isConfirmedSent(guest.invitationStatus) && !isAwaitingConfirmation(guest.invitationStatus);
        }
        if (lane === 'awaiting') return isAwaitingConfirmation(guest.invitationStatus);
        if (lane === 'sent') return isConfirmedSent(guest.invitationStatus);
        return true;
      })
      .filter((guest) =>
        term
          ? `${guest.primaryGuestName} ${guest.invitationDisplayName} ${guest.village ?? ''}`
              .toLowerCase()
              .includes(term)
          : true
      )
      .sort((a, b) => a.primaryGuestName.localeCompare(b.primaryGuestName));
  }, [all, lane, search]);

  if (guests === undefined || template === undefined || messageTemplate === undefined || !settings) {
    return <p className="py-10 text-center text-sm text-muted">Loading invitations…</p>;
  }

  const missingSetup: Array<{ label: string; href: string }> = [];
  if (!template) missingSetup.push({ label: 'Add your invitation card', href: '/invitations' });
  if (!wedding?.eventDates || !wedding?.venueName) {
    missingSetup.push({ label: 'Add the dates and venue', href: '/more/settings' });
  }

  return (
    <div className="space-y-4">
      {!template ? (
        <Card>
          <CardHeader
            title="Your invitation card"
            description="Upload it once, place the guest name, and every invitation is made from it."
          />
          <div className="p-4">
            <TemplateUpload />
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Your invitation card"
            description={`${template.fileName} · ${formatBytes(template.sizeBytes)}`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditor((current) => !current)}
                aria-expanded={showEditor}
              >
                {showEditor ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                {showEditor ? 'Hide' : 'Place the name'}
              </Button>
            }
          />
          {showEditor ? (
            <div className="space-y-4 p-4">
              <PlacementEditor template={template} longestGuestName={longestGuestName} />
              <div className="flex gap-2">
                <TemplateUpload compact />
                <Button variant="ghost" size="icon" aria-label="Remove this card" onClick={() => setConfirmRemoveTemplate(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {missingSetup.length > 0 ? (
        <InlineNotice tone="warning">
          Before sending:{' '}
          {missingSetup.map((item, index) => (
            <span key={item.label}>
              {index > 0 ? ', ' : ''}
              <Link href={item.href} className="font-semibold underline">
                {item.label}
              </Link>
            </span>
          ))}
        </InlineNotice>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-8 w-8" aria-hidden />}
          title="No guests to invite yet"
          description="Add your guest list first. Then you can make a personal invitation for each household."
          action={
            <Link href="/guests" className="flex min-h-touch items-center rounded-lg bg-crimson px-4 font-semibold text-white">
              Go to Guests
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Still to send" value={progress.pending + progress.generated + progress.failed} />
            <Tile label="Waiting for your answer" value={progress.awaitingConfirmation} tone={progress.awaitingConfirmation > 0 ? 'warning' : 'neutral'} />
            <Tile label="Confirmed sent" value={progress.confirmedSent} tone="success" />
            <Tile label="Need a check" value={progress.needsReview} tone={progress.needsReview > 0 ? 'warning' : 'neutral'} />
          </div>

          <Input
            type="search"
            aria-label="Search guests"
            placeholder="Search by name or village"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-2 pb-1">
              {LANES.map((item) => (
                <Chip key={item.id} active={lane === item.id} onClick={() => setLane(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="Nothing in this list"
              description="Try another tab, or clear the search."
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((guest) => (
                <li key={guest.id} className="app-card flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{guest.primaryGuestName}</p>
                    <p className="truncate text-xs text-muted">
                      {guest.invitationDisplayName}
                      {guest.village ? ` · ${guest.village}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <InvitationStatusBadge status={guest.invitationStatus} />
                    </div>
                    {guest.lastError ? (
                      <p className="mt-1 text-xs text-warning">{guest.lastError}</p>
                    ) : null}
                  </div>
                  <Button size="sm" onClick={() => setSending(guest)}>
                    <Send className="h-4 w-4" aria-hidden />
                    {isConfirmedSent(guest.invitationStatus) ? 'Send again' : 'Prepare'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div aria-hidden className="h-4" />

      <SendDialog
        guest={sending}
        template={template}
        messageBody={messageTemplate?.body ?? ''}
        wedding={wedding ?? null}
        defaultCountryCode={settings.defaultCountryCode}
        onClose={() => setSending(null)}
      />

      <ConfirmDialog
        open={confirmRemoveTemplate}
        title="Remove this invitation card?"
        description="The card is deleted from this phone. Guests and their sending history are not touched."
        confirmLabel="Remove card"
        destructive
        onCancel={() => setConfirmRemoveTemplate(false)}
        onConfirm={async () => {
          if (template) await deleteTemplate(template.id);
          setConfirmRemoveTemplate(false);
          setShowEditor(false);
        }}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'success';
}) {
  const colour = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-ink';
  return (
    <div className="app-card p-3">
      <p className={`text-xl font-semibold tabular-nums ${colour}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
