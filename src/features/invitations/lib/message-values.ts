import { renderMessage, type MergeValues } from '@/lib/message/merge';
import type { GuestHousehold, WeddingSettings } from '@/lib/models';

/** Builds the merge values for one guest. Nothing is invented: missing settings stay empty. */
export function buildMergeValues(
  guest: Pick<GuestHousehold, 'invitationDisplayName' | 'primaryGuestName' | 'village'>,
  wedding: Pick<WeddingSettings, 'eventDates' | 'venueName' | 'mapLink'> | null
): MergeValues {
  return {
    guestName: guest.invitationDisplayName || guest.primaryGuestName,
    village: guest.village ?? '',
    eventDates: wedding?.eventDates ?? '',
    venue: wedding?.venueName ?? '',
    mapLink: wedding?.mapLink ?? '',
  };
}

export const SAMPLE_MERGE_VALUES: MergeValues = {
  guestName: 'Mr. & Mrs. Ramesh Patel',
  village: 'Kahoda',
  eventDates: '12 to 14 June 2026',
  venue: 'Umiya Mataji Campus',
  mapLink: 'https://maps.app.goo.gl/example',
};

export function renderForGuest(
  template: string,
  guest: Pick<GuestHousehold, 'invitationDisplayName' | 'primaryGuestName' | 'village'>,
  wedding: Pick<WeddingSettings, 'eventDates' | 'venueName' | 'mapLink'> | null
): string {
  return renderMessage(template, buildMergeValues(guest, wedding));
}
