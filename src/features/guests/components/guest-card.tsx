'use client';

import { AlertTriangle, PhoneOff, Users } from 'lucide-react';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/format/phone';
import { cn } from '@/lib/utils';
import type { GuestHousehold } from '@/lib/models';
import { InvitationStatusBadge, SideBadge } from './guest-badges';

export function GuestCard({
  guest,
  selected,
  selectionMode,
  onToggleSelect,
  onOpen,
}: {
  guest: GuestHousehold;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (guest: GuestHousehold) => void;
  onOpen: (guest: GuestHousehold) => void;
}) {
  const phone = guest.rawPhone ? normalizePhone(guest.rawPhone) : null;

  return (
    <div className={cn('app-card flex items-start gap-3 p-3', selected && 'border-crimson')}>
      {selectionMode ? (
        <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center">
          <span className="sr-only">Select {guest.primaryGuestName}</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-[#800020]"
            checked={selected}
            onChange={() => onToggleSelect(guest)}
          />
        </label>
      ) : null}

      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(guest)}>
        <p className="text-[15px] font-medium leading-snug">{guest.primaryGuestName}</p>
        {guest.invitationDisplayName !== guest.primaryGuestName ? (
          <p className="truncate text-xs text-muted">Card: {guest.invitationDisplayName}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SideBadge side={guest.side} />
          <InvitationStatusBadge status={guest.invitationStatus} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {guest.village ? <span>{guest.village}</span> : null}
          {phone?.normalized ? (
            <span>{formatPhoneForDisplay(phone)}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-warning">
              <PhoneOff className="h-3.5 w-3.5" aria-hidden />
              {guest.rawPhone ? guest.rawPhone : 'No number'}
            </span>
          )}
          {guest.expectedGuestCount !== null ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {guest.expectedGuestCount}
            </span>
          ) : null}
        </div>

        {guest.needsReview ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded bg-warning/5 px-2 py-1 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {guest.lastError ?? 'Needs a check'}
          </p>
        ) : null}
      </button>
    </div>
  );
}
