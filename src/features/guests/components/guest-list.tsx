'use client';

import { formatPhoneForDisplay, normalizePhone } from '@/lib/format/phone';
import type { GuestHousehold } from '@/lib/models';
import { GuestCard } from './guest-card';
import { InvitationStatusBadge } from './guest-badges';

export function GuestList({
  guests,
  selectedIds,
  selectionMode,
  onToggleSelect,
  onToggleAll,
  onOpen,
}: {
  guests: GuestHousehold[];
  selectedIds: Set<string>;
  selectionMode: boolean;
  onToggleSelect: (guest: GuestHousehold) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (guest: GuestHousehold) => void;
}) {
  const allSelected = guests.length > 0 && guests.every((guest) => selectedIds.has(guest.id));

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {guests.map((guest) => (
          <li key={guest.id}>
            <GuestCard
              guest={guest}
              selected={selectedIds.has(guest.id)}
              selectionMode={selectionMode}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <caption className="sr-only">Guest households</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="w-10 px-2 pb-1">
                <label className="flex h-10 w-10 items-center justify-center">
                  <span className="sr-only">Select all shown guests</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#800020]"
                    checked={allSelected}
                    onChange={(event) => onToggleAll(event.target.checked)}
                  />
                </label>
              </th>
              <th scope="col" className="px-2 pb-1">Guest</th>
              <th scope="col" className="px-2 pb-1">Village</th>
              <th scope="col" className="px-2 pb-1">Number</th>
              <th scope="col" className="px-2 pb-1">Side</th>
              <th scope="col" className="px-2 pb-1">Status</th>
              <th scope="col" className="px-2 pb-1 text-right">People</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => {
              const phone = guest.rawPhone ? normalizePhone(guest.rawPhone) : null;
              return (
                <tr key={guest.id} className="bg-white align-middle shadow-card">
                  <td className="rounded-l-card px-2 py-2">
                    <label className="flex h-10 w-10 items-center justify-center">
                      <span className="sr-only">Select {guest.primaryGuestName}</span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#800020]"
                        checked={selectedIds.has(guest.id)}
                        onChange={() => onToggleSelect(guest)}
                      />
                    </label>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" className="text-left font-medium" onClick={() => onOpen(guest)}>
                      {guest.primaryGuestName}
                    </button>
                    {guest.needsReview ? (
                      <span className="block text-xs text-warning">{guest.lastError ?? 'Needs a check'}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted">{guest.village ?? '—'}</td>
                  <td className="px-2 py-2 text-muted">
                    {phone?.normalized ? formatPhoneForDisplay(phone) : (guest.rawPhone || '—')}
                  </td>
                  <td className="px-2 py-2 text-muted">{guest.side}</td>
                  <td className="px-2 py-2">
                    <InvitationStatusBadge status={guest.invitationStatus} />
                  </td>
                  <td className="rounded-r-card px-2 py-2 text-right tabular-nums text-muted">
                    {guest.expectedGuestCount ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
