import { describe, expect, it } from 'vitest';
import {
  applyDispatchEvent,
  isAwaitingConfirmation,
  isConfirmedSent,
  summariseDispatch,
  type GuestDispatchFields,
} from './dispatch-rules';
import type { GuestHousehold } from '@/lib/models';

const AT = '2026-06-10T09:00:00.000Z';

const fresh = (): GuestDispatchFields => ({
  invitationStatus: 'Pending',
  generatedAt: null,
  shareSheetOpenedAt: null,
  whatsAppOpenedAt: null,
  sentConfirmedAt: null,
  lastError: null,
});

describe('opening something never counts as sending it', () => {
  it('does not mark sent when the share sheet opens', () => {
    const changes = applyDispatchEvent(fresh(), 'share-opened', AT);
    expect(changes.invitationStatus).toBe('Share Sheet Opened');
    expect(changes.sentConfirmedAt).toBe(undefined);
  });

  it('does not mark sent when WhatsApp opens', () => {
    const changes = applyDispatchEvent(fresh(), 'whatsapp-opened', AT);
    expect(changes.invitationStatus).toBe('WhatsApp Opened');
    expect(changes.whatsAppOpenedAt).toBe(AT);
    expect(changes.sentConfirmedAt).toBe(undefined);
  });

  it('does not mark sent when the PDF is downloaded', () => {
    const changes = applyDispatchEvent(fresh(), 'downloaded', AT);
    expect(changes.invitationStatus).toBe('Invitation Generated');
    expect(changes.sentConfirmedAt).toBe(undefined);
  });

  it('only the explicit confirmation produces the sent status', () => {
    const events = ['generated', 'share-opened', 'whatsapp-opened', 'downloaded', 'not-sent', 'failed'] as const;
    for (const event of events) {
      expect(applyDispatchEvent(fresh(), event, AT).invitationStatus).not.toBe(
        'Sent Confirmed Manually'
      );
    }
    expect(applyDispatchEvent(fresh(), 'confirmed-sent', AT).invitationStatus).toBe(
      'Sent Confirmed Manually'
    );
  });
});

describe('status transitions', () => {
  it('records generation time and clears an earlier error', () => {
    const changes = applyDispatchEvent({ ...fresh(), lastError: 'old problem' }, 'generated', AT);
    expect(changes.generatedAt).toBe(AT);
    expect(changes.lastError).toBeNull();
  });

  it('keeps the first confirmation time if confirmed twice', () => {
    const earlier = '2026-06-01T00:00:00.000Z';
    const changes = applyDispatchEvent(
      { ...fresh(), invitationStatus: 'Sent Confirmed Manually', sentConfirmedAt: earlier },
      'confirmed-sent',
      AT
    );
    expect(changes.sentConfirmedAt).toBe(earlier);
  });

  it('puts a "not sent" answer back to ready rather than losing the work', () => {
    const changes = applyDispatchEvent(
      { ...fresh(), invitationStatus: 'WhatsApp Opened', whatsAppOpenedAt: AT },
      'not-sent',
      AT
    );
    expect(changes.invitationStatus).toBe('Invitation Generated');
  });

  it('records a failure with its reason', () => {
    const changes = applyDispatchEvent(fresh(), 'failed', AT, 'The name does not fit the card');
    expect(changes.invitationStatus).toBe('Failed');
    expect(changes.lastError).toBe('The name does not fit the card');
  });

  it('never downgrades a guest already confirmed as sent', () => {
    const confirmed: GuestDispatchFields = {
      ...fresh(),
      invitationStatus: 'Sent Confirmed Manually',
      sentConfirmedAt: AT,
    };
    for (const event of ['generated', 'share-opened', 'whatsapp-opened', 'downloaded', 'not-sent', 'failed'] as const) {
      expect(applyDispatchEvent(confirmed, event, AT).invitationStatus).toBe(
        'Sent Confirmed Manually'
      );
    }
  });

  it('still records the timestamp when a confirmed guest is shared again', () => {
    const confirmed: GuestDispatchFields = {
      ...fresh(),
      invitationStatus: 'Sent Confirmed Manually',
      sentConfirmedAt: AT,
    };
    expect(applyDispatchEvent(confirmed, 'share-opened', '2026-06-11T00:00:00.000Z').shareSheetOpenedAt)
      .toBe('2026-06-11T00:00:00.000Z');
  });
});

describe('status helpers', () => {
  it('knows which statuses are waiting for an answer', () => {
    expect(isAwaitingConfirmation('Share Sheet Opened')).toBe(true);
    expect(isAwaitingConfirmation('WhatsApp Opened')).toBe(true);
    expect(isAwaitingConfirmation('Invitation Generated')).toBe(false);
    expect(isConfirmedSent('Sent Confirmed Manually')).toBe(true);
    expect(isConfirmedSent('WhatsApp Opened')).toBe(false);
  });

  it('counts progress for the dashboard', () => {
    const guests = [
      { invitationStatus: 'Pending', needsReview: false },
      { invitationStatus: 'Invitation Generated', needsReview: false },
      { invitationStatus: 'WhatsApp Opened', needsReview: false },
      { invitationStatus: 'Share Sheet Opened', needsReview: false },
      { invitationStatus: 'Sent Confirmed Manually', needsReview: false },
      { invitationStatus: 'Failed', needsReview: true },
    ] as GuestHousehold[];

    expect(summariseDispatch(guests)).toEqual({
      total: 6,
      pending: 1,
      generated: 1,
      awaitingConfirmation: 2,
      confirmedSent: 1,
      failed: 1,
      needsReview: 1,
    });
  });
});
