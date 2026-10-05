import type { GuestHousehold, InvitationStatus } from '@/lib/models';
import { CONFIRMED_SENT_STATUS } from '@/lib/models/enums';

export type DispatchMethod = 'native-share' | 'whatsapp-link' | 'manual-download';

export type DispatchEvent =
  | 'generated'
  | 'share-opened'
  | 'whatsapp-opened'
  | 'downloaded'
  | 'confirmed-sent'
  | 'not-sent'
  | 'failed';

export type GuestDispatchFields = Pick<
  GuestHousehold,
  | 'invitationStatus'
  | 'generatedAt'
  | 'shareSheetOpenedAt'
  | 'whatsAppOpenedAt'
  | 'sentConfirmedAt'
  | 'lastError'
>;

/**
 * The single place that decides what an action means for an invitation's status.
 *
 * Two rules are deliberate and tested:
 *   1. Opening the share sheet or WhatsApp records only that it was opened. Nothing here
 *      can produce "Sent Confirmed Manually" except the explicit 'confirmed-sent' event.
 *   2. A guest already confirmed as sent is never downgraded by opening something again -
 *      the timestamp is recorded, the status stays confirmed.
 */
export function applyDispatchEvent(
  current: GuestDispatchFields,
  event: DispatchEvent,
  at: string,
  errorMessage?: string
): Partial<GuestDispatchFields> {
  const alreadyConfirmed = current.invitationStatus === CONFIRMED_SENT_STATUS;
  const keepOrSet = (status: InvitationStatus): InvitationStatus =>
    alreadyConfirmed ? CONFIRMED_SENT_STATUS : status;

  switch (event) {
    case 'generated':
      return {
        invitationStatus: keepOrSet('Invitation Generated'),
        generatedAt: at,
        lastError: null,
      };
    case 'share-opened':
      return {
        invitationStatus: keepOrSet('Share Sheet Opened'),
        shareSheetOpenedAt: at,
        lastError: null,
      };
    case 'whatsapp-opened':
      return {
        invitationStatus: keepOrSet('WhatsApp Opened'),
        whatsAppOpenedAt: at,
        lastError: null,
      };
    case 'downloaded':
      // Downloading is preparation, not sending, so the status stays at generated.
      return {
        invitationStatus: keepOrSet('Invitation Generated'),
        generatedAt: current.generatedAt ?? at,
        lastError: null,
      };
    case 'confirmed-sent':
      return {
        invitationStatus: CONFIRMED_SENT_STATUS,
        sentConfirmedAt: current.sentConfirmedAt ?? at,
        lastError: null,
      };
    case 'not-sent':
      // Back to "ready to try again", keeping the record that something was opened.
      return {
        invitationStatus: alreadyConfirmed ? CONFIRMED_SENT_STATUS : 'Invitation Generated',
        lastError: null,
      };
    case 'failed':
      return {
        invitationStatus: alreadyConfirmed ? CONFIRMED_SENT_STATUS : 'Failed',
        lastError: errorMessage ?? 'Something went wrong while preparing this invitation',
      };
    default:
      return {};
  }
}

export function isAwaitingConfirmation(status: InvitationStatus): boolean {
  return status === 'Share Sheet Opened' || status === 'WhatsApp Opened';
}

export function isConfirmedSent(status: InvitationStatus): boolean {
  return status === CONFIRMED_SENT_STATUS;
}

export interface DispatchProgress {
  total: number;
  pending: number;
  generated: number;
  awaitingConfirmation: number;
  confirmedSent: number;
  failed: number;
  needsReview: number;
}

export function summariseDispatch(guests: GuestHousehold[]): DispatchProgress {
  return {
    total: guests.length,
    pending: guests.filter((guest) => guest.invitationStatus === 'Pending').length,
    generated: guests.filter((guest) => guest.invitationStatus === 'Invitation Generated').length,
    awaitingConfirmation: guests.filter((guest) => isAwaitingConfirmation(guest.invitationStatus))
      .length,
    confirmedSent: guests.filter((guest) => isConfirmedSent(guest.invitationStatus)).length,
    failed: guests.filter((guest) => guest.invitationStatus === 'Failed').length,
    needsReview: guests.filter((guest) => guest.needsReview).length,
  };
}
