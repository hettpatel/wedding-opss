'use client';

import { CheckCheck, Plus, Trash2, Upload, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form-controls';
import { useToast } from '@/components/ui/toast';
import { useAppSettings } from '@/hooks/use-app-data';
import { INVITATION_STATUSES, type GuestHousehold, type InvitationStatus } from '@/lib/models';
import { GuestFilterBar } from '@/features/guests/components/guest-filters';
import { GuestForm } from '@/features/guests/components/guest-form';
import { GuestList } from '@/features/guests/components/guest-list';
import { ImportWizard } from '@/features/guests/components/import-wizard';
import { useGuests } from '@/features/guests/hooks/use-guests';
import {
  applyGuestFilters,
  DEFAULT_GUEST_FILTERS,
  summariseGuests,
  type GuestFilters,
} from '@/features/guests/lib/guest-queries';
import {
  clearNeedsReview,
  deleteGuests,
  restoreGuests,
  setGuestStatus,
} from '@/features/guests/lib/guest-service';

export default function GuestsPage() {
  const guests = useGuests();
  const settings = useAppSettings();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_GUEST_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formGuest, setFormGuest] = useState<GuestHousehold | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<InvitationStatus | ''>('');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => guests ?? [], [guests]);
  const summary = useMemo(() => summariseGuests(all), [all]);
  const visible = useMemo(() => applyGuestFilters(all, filters), [all, filters]);
  const selected = useMemo(
    () => all.filter((guest) => selectedIds.has(guest.id)),
    [all, selectedIds]
  );

  const toggleSelect = (guest: GuestHousehold) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(guest.id)) next.delete(guest.id);
      else next.add(guest.id);
      return next;
    });
  };

  const openNew = () => {
    setFormGuest(null);
    setFormOpen(true);
  };

  if (!guests || !settings) {
    return <p className="py-10 text-center text-sm text-muted">Loading your guest list…</p>;
  }

  return (
    <div className="space-y-4">
      {all.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Households" value={summary.households} />
          <Tile label="People expected" value={summary.people} />
          <Tile label="Need a check" value={summary.needsReview} tone={summary.needsReview > 0 ? 'warning' : 'neutral'} />
          <Tile label="Without a number" value={summary.withoutPhone} tone={summary.withoutPhone > 0 ? 'warning' : 'neutral'} />
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button variant="quiet" size="block" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" aria-hidden />
          Import from a file
        </Button>
        <Button size="block" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          Add a guest
        </Button>
      </div>

      {all.length > 0 ? (
        <GuestFilterBar
          filters={filters}
          counts={{ all: summary.households, needsReview: summary.needsReview, noPhone: summary.withoutPhone }}
          onChange={setFilters}
        />
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" aria-hidden />}
          title="No guests yet"
          description="Import your list from Excel or CSV, or add the first household by hand. You will see a full preview before anything is saved."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" aria-hidden />}
          title="No guests match these filters"
          description="Try a different side or status, or clear the filters to see everyone."
          action={
            <Button variant="secondary" onClick={() => setFilters(DEFAULT_GUEST_FILTERS)}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {visible.length} of {summary.households} household{summary.households === 1 ? '' : 's'}
          </p>
          <GuestList
            guests={visible}
            selectedIds={selectedIds}
            selectionMode
            onToggleSelect={toggleSelect}
            onToggleAll={(checked) =>
              setSelectedIds(checked ? new Set(visible.map((guest) => guest.id)) : new Set())
            }
            onOpen={(guest) => {
              setFormGuest(guest);
              setFormOpen(true);
            }}
          />
        </>
      )}

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(64px_+_env(safe-area-inset-bottom))] z-30 border-t border-hairline bg-white px-4 py-3 md:bottom-0">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{selected.length} selected</p>
              <button
                type="button"
                className="min-h-[40px] text-sm font-medium text-crimson"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Set invitation status for the selected guests"
                className="min-w-0 flex-1"
                value={bulkStatus}
                onChange={(event) => {
                  setBulkStatus(event.target.value as InvitationStatus | '');
                  if (event.target.value) setConfirmStatus(true);
                }}
              >
                <option value="">Set status…</option>
                {INVITATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Button
                variant="quiet"
                size="icon"
                aria-label="Mark the selected guests as checked"
                onClick={async () => {
                  const snapshots = selected.map((guest) => ({ ...guest }));
                  await clearNeedsReview(selected.map((guest) => guest.id));
                  showToast({
                    message: `${snapshots.length} guests marked as checked`,
                    action: { label: 'Undo', onClick: () => void restoreGuests(snapshots) },
                  });
                }}
              >
                <CheckCheck className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                variant="quiet"
                size="icon"
                aria-label="Delete the selected guests"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div aria-hidden className="h-24" />

      <GuestForm
        open={formOpen}
        guest={formGuest}
        allGuests={all}
        defaultCountryCode={settings.defaultCountryCode}
        onClose={() => {
          setFormOpen(false);
          setFormGuest(null);
        }}
      />

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingGuests={all}
        defaultCountryCode={settings.defaultCountryCode}
      />

      <ConfirmDialog
        open={confirmStatus && bulkStatus !== ''}
        title={`Set ${selected.length} guests to "${bulkStatus}"?`}
        description={
          bulkStatus === 'Sent Confirmed Manually'
            ? 'This records that you sent these invitations yourself. Only do this for invitations you actually sent.'
            : 'The invitation status of every selected guest will change. You can undo this straight afterwards.'
        }
        confirmLabel="Change status"
        pending={busy}
        onCancel={() => {
          setConfirmStatus(false);
          setBulkStatus('');
        }}
        onConfirm={async () => {
          if (!bulkStatus) return;
          setBusy(true);
          const snapshots = selected.map((guest) => ({ ...guest }));
          await setGuestStatus(
            selected.map((guest) => guest.id),
            bulkStatus
          );
          setBusy(false);
          setConfirmStatus(false);
          setBulkStatus('');
          showToast({
            message: `${snapshots.length} guests updated`,
            tone: 'success',
            action: { label: 'Undo', onClick: () => void restoreGuests(snapshots) },
          });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${selected.length} guest${selected.length === 1 ? '' : 's'}?`}
        description="These households will be removed from this phone, with their invitation history. This cannot be undone."
        confirmLabel="Delete guests"
        destructive
        pending={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setBusy(true);
          await deleteGuests(selected.map((guest) => guest.id));
          setBusy(false);
          setConfirmDelete(false);
          setSelectedIds(new Set());
          showToast({ message: 'Guests deleted' });
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
  tone?: 'neutral' | 'warning';
}) {
  return (
    <div className="app-card p-3">
      <p className={`text-xl font-semibold tabular-nums ${tone === 'warning' ? 'text-warning' : 'text-ink'}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
