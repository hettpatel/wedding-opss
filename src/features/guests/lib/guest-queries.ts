import { INVITATION_STATUSES, type GuestSide, type InvitationStatus } from '@/lib/models/enums';
import type { GuestHousehold } from '@/lib/models';

export type GuestSort = 'name' | 'village' | 'status' | 'recent';

export const GUEST_SORTS: Array<{ id: GuestSort; label: string }> = [
  { id: 'name', label: 'Name A-Z' },
  { id: 'village', label: 'Village A-Z' },
  { id: 'status', label: 'Invitation status' },
  { id: 'recent', label: 'Recently added' },
];

export interface GuestFilters {
  search: string;
  side: GuestSide | 'all';
  status: InvitationStatus | 'all';
  needsReviewOnly: boolean;
  sort: GuestSort;
}

export const DEFAULT_GUEST_FILTERS: GuestFilters = {
  search: '',
  side: 'all',
  status: 'all',
  needsReviewOnly: false,
  sort: 'name',
};

const STATUS_ORDER = new Map<InvitationStatus, number>(
  INVITATION_STATUSES.map((status, index) => [status, index])
);

export function applyGuestFilters(guests: GuestHousehold[], filters: GuestFilters): GuestHousehold[] {
  const term = filters.search.trim().toLowerCase();

  const filtered = guests.filter((guest) => {
    if (filters.side !== 'all' && guest.side !== filters.side) return false;
    if (filters.status !== 'all' && guest.invitationStatus !== filters.status) return false;
    if (filters.needsReviewOnly && !guest.needsReview) return false;

    if (term) {
      const haystack = [
        guest.primaryGuestName,
        guest.invitationDisplayName,
        guest.village ?? '',
        guest.rawPhone ?? '',
        guest.normalizedPhone ?? '',
        guest.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return sortGuests(filtered, filters.sort);
}

export function sortGuests(guests: GuestHousehold[], sort: GuestSort): GuestHousehold[] {
  const copy = [...guests];
  switch (sort) {
    case 'village':
      return copy.sort(
        (a, b) =>
          (a.village ?? '~').localeCompare(b.village ?? '~') ||
          a.primaryGuestName.localeCompare(b.primaryGuestName)
      );
    case 'status':
      return copy.sort(
        (a, b) =>
          (STATUS_ORDER.get(a.invitationStatus) ?? 0) - (STATUS_ORDER.get(b.invitationStatus) ?? 0) ||
          a.primaryGuestName.localeCompare(b.primaryGuestName)
      );
    case 'recent':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'name':
    default:
      return copy.sort((a, b) => a.primaryGuestName.localeCompare(b.primaryGuestName));
  }
}

export interface GuestSummary {
  total: number;
  households: number;
  people: number;
  needsReview: number;
  withoutPhone: number;
  byStatus: Record<string, number>;
  bySide: Record<GuestSide, number>;
}

export function summariseGuests(guests: GuestHousehold[]): GuestSummary {
  const byStatus: Record<string, number> = {};
  const bySide: Record<GuestSide, number> = { Groom: 0, Bride: 0, Common: 0 };

  for (const guest of guests) {
    byStatus[guest.invitationStatus] = (byStatus[guest.invitationStatus] ?? 0) + 1;
    bySide[guest.side] += 1;
  }

  return {
    total: guests.length,
    households: guests.length,
    people: guests.reduce((sum, guest) => sum + (guest.expectedGuestCount ?? 0), 0),
    needsReview: guests.filter((guest) => guest.needsReview).length,
    withoutPhone: guests.filter((guest) => !guest.normalizedPhone).length,
    byStatus,
    bySide,
  };
}

export function countActiveGuestFilters(filters: GuestFilters): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.side !== 'all') count += 1;
  if (filters.status !== 'all') count += 1;
  if (filters.needsReviewOnly) count += 1;
  return count;
}
