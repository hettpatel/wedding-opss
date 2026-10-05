import { createRecord, touchRecord } from '@/lib/db/records';
import { normalizePhone } from '@/lib/format/phone';
import type { GuestSide, InvitationStatus } from '@/lib/models/enums';
import type { GuestHousehold } from '@/lib/models';
import type { GuestDraft } from './guest-import';

export interface GuestFormValues {
  primaryGuestName: string;
  invitationDisplayName: string;
  rawPhone: string;
  village: string;
  side: GuestSide;
  expectedGuestCount: string;
  notes: string;
  invitationStatus: InvitationStatus;
  needsReview: boolean;
}

export const EMPTY_GUEST_FORM: GuestFormValues = {
  primaryGuestName: '',
  invitationDisplayName: '',
  rawPhone: '',
  village: '',
  side: 'Common',
  expectedGuestCount: '',
  notes: '',
  invitationStatus: 'Pending',
  needsReview: false,
};

export function guestToFormValues(guest: GuestHousehold): GuestFormValues {
  return {
    primaryGuestName: guest.primaryGuestName,
    invitationDisplayName: guest.invitationDisplayName,
    rawPhone: guest.rawPhone ?? '',
    village: guest.village ?? '',
    side: guest.side,
    expectedGuestCount: guest.expectedGuestCount === null ? '' : String(guest.expectedGuestCount),
    notes: guest.notes ?? '',
    invitationStatus: guest.invitationStatus,
    needsReview: guest.needsReview,
  };
}

const blank = (value: string): string | null => (value.trim() === '' ? null : value.trim());

export function formValuesToGuest(
  values: GuestFormValues,
  options: { existing?: GuestHousehold; defaultCountryCode: string }
): GuestHousehold {
  const phone = normalizePhone(values.rawPhone, options.defaultCountryCode);
  const name = values.primaryGuestName.trim();

  const common = {
    primaryGuestName: name,
    invitationDisplayName: values.invitationDisplayName.trim() || name,
    rawPhone: blank(values.rawPhone),
    normalizedPhone: phone.normalized,
    countryCode: phone.countryCode,
    village: blank(values.village),
    side: values.side,
    expectedGuestCount:
      values.expectedGuestCount.trim() === '' ? null : Number(values.expectedGuestCount),
    notes: blank(values.notes),
    invitationStatus: values.invitationStatus,
    // A guest with an unusable number always stays flagged, whatever the checkbox says.
    needsReview: values.needsReview || phone.status !== 'ok',
    lastError: phone.status === 'ok' ? null : phone.message,
  };

  if (options.existing) {
    return touchRecord(options.existing, common);
  }

  return createRecord<GuestHousehold>({
    ...common,
    generatedAt: null,
    shareSheetOpenedAt: null,
    whatsAppOpenedAt: null,
    sentConfirmedAt: null,
    importBatchId: null,
  });
}

export function draftToGuest(
  draft: GuestDraft,
  options: { importBatchId: string; flagForReview: boolean }
): GuestHousehold {
  const needsReview = draft.needsReview || options.flagForReview;
  return createRecord<GuestHousehold>({
    primaryGuestName: draft.primaryGuestName,
    invitationDisplayName: draft.invitationDisplayName,
    rawPhone: draft.rawPhone,
    normalizedPhone: draft.normalizedPhone,
    countryCode: draft.countryCode,
    village: draft.village,
    side: draft.side,
    expectedGuestCount: draft.expectedGuestCount,
    notes: draft.notes,
    invitationStatus: needsReview ? 'Needs Review' : 'Pending',
    generatedAt: null,
    shareSheetOpenedAt: null,
    whatsAppOpenedAt: null,
    sentConfirmedAt: null,
    lastError: draft.phoneStatus === 'ok' ? null : 'Check the WhatsApp number',
    needsReview,
    importBatchId: options.importBatchId,
  });
}

/** Replacing keeps the existing id, history and timestamps; only the details change. */
export function applyDraftToExisting(
  existing: GuestHousehold,
  draft: GuestDraft,
  importBatchId: string
): GuestHousehold {
  return touchRecord(existing, {
    primaryGuestName: draft.primaryGuestName,
    invitationDisplayName: draft.invitationDisplayName,
    rawPhone: draft.rawPhone,
    normalizedPhone: draft.normalizedPhone,
    countryCode: draft.countryCode,
    village: draft.village,
    side: draft.side,
    expectedGuestCount: draft.expectedGuestCount,
    notes: draft.notes,
    needsReview: draft.needsReview || existing.needsReview,
    importBatchId,
  });
}
