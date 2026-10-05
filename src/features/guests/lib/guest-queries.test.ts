import { describe, expect, it } from 'vitest';
import type { GuestHousehold } from '@/lib/models';
import {
  applyGuestFilters,
  countActiveGuestFilters,
  DEFAULT_GUEST_FILTERS,
  summariseGuests,
} from './guest-queries';

function guest(partial: Partial<GuestHousehold> & { id: string }): GuestHousehold {
  return {
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    schemaVersion: 1,
    source: 'user',
    primaryGuestName: 'Guest',
    invitationDisplayName: 'Guest',
    rawPhone: null,
    normalizedPhone: null,
    countryCode: null,
    village: null,
    side: 'Common',
    expectedGuestCount: null,
    notes: null,
    invitationStatus: 'Pending',
    generatedAt: null,
    shareSheetOpenedAt: null,
    whatsAppOpenedAt: null,
    sentConfirmedAt: null,
    lastError: null,
    needsReview: false,
    importBatchId: null,
    ...partial,
  } as GuestHousehold;
}

const guests: GuestHousehold[] = [
  guest({ id: '1', primaryGuestName: 'Ramesh Patel', village: 'Kahoda', side: 'Groom', normalizedPhone: '919876543210', expectedGuestCount: 4 }),
  guest({ id: '2', primaryGuestName: 'Dinesh Chaudhary', village: 'Mehsana', side: 'Bride', invitationStatus: 'Invitation Generated', expectedGuestCount: 3, normalizedPhone: '919123456780' }),
  guest({ id: '3', primaryGuestName: 'Kiran Thakor', village: 'Unjha', needsReview: true, invitationStatus: 'Needs Review', expectedGuestCount: 2 }),
];

describe('applyGuestFilters', () => {
  it('searches name, village and number', () => {
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, search: 'kahoda' }).map((g) => g.id)).toEqual(['1']);
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, search: '9123456780' }).map((g) => g.id)).toEqual(['2']);
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, search: 'thakor' }).map((g) => g.id)).toEqual(['3']);
  });

  it('filters by side, status and review flag', () => {
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, side: 'Bride' }).map((g) => g.id)).toEqual(['2']);
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, status: 'Pending' }).map((g) => g.id)).toEqual(['1']);
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, needsReviewOnly: true }).map((g) => g.id)).toEqual(['3']);
  });

  it('sorts by name, village and status', () => {
    expect(applyGuestFilters(guests, DEFAULT_GUEST_FILTERS).map((g) => g.primaryGuestName)[0]).toBe('Dinesh Chaudhary');
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, sort: 'village' }).map((g) => g.id)).toEqual(['1', '2', '3']);
    expect(applyGuestFilters(guests, { ...DEFAULT_GUEST_FILTERS, sort: 'status' }).map((g) => g.id)[0]).toBe('1');
  });

  it('counts the filters that are switched on', () => {
    expect(countActiveGuestFilters(DEFAULT_GUEST_FILTERS)).toBe(0);
    expect(countActiveGuestFilters({ ...DEFAULT_GUEST_FILTERS, side: 'Groom', needsReviewOnly: true })).toBe(2);
  });
});

describe('summariseGuests', () => {
  it('counts households, people and problems', () => {
    const summary = summariseGuests(guests);
    expect(summary.households).toBe(3);
    expect(summary.people).toBe(9);
    expect(summary.needsReview).toBe(1);
    expect(summary.withoutPhone).toBe(1);
    expect(summary.bySide.Groom).toBe(1);
  });
});
