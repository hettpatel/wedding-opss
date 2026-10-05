import { describe, expect, it } from 'vitest';
import { EMPTY_MAPPING } from './column-mapping';
import { prepareRows } from './guest-import';
import { EMPTY_GUEST_FORM, applyDraftToExisting, draftToGuest, formValuesToGuest, guestToFormValues } from './guest-mapping';
import { buildIssueCsv } from './rejected-rows';

const headers = ['Guest Name', 'WhatsApp Number', 'Village'];
const mapping = { ...EMPTY_MAPPING, primaryGuestName: 0, phone: 1, village: 2 };
const prepare = (rows: string[][]) =>
  prepareRows([headers, ...rows], { mapping, headerRowIndex: 0, headers, defaultCountryCode: '91' });

describe('formValuesToGuest', () => {
  it('normalises the number and keeps what was typed', () => {
    const guest = formValuesToGuest(
      { ...EMPTY_GUEST_FORM, primaryGuestName: ' Ramesh Patel ', rawPhone: '+91 98765 43210' },
      { defaultCountryCode: '91' }
    );
    expect(guest.primaryGuestName).toBe('Ramesh Patel');
    expect(guest.rawPhone).toBe('+91 98765 43210');
    expect(guest.normalizedPhone).toBe('919876543210');
    expect(guest.needsReview).toBe(false);
  });

  it('copies the guest name into the display name when it is blank', () => {
    const guest = formValuesToGuest(
      { ...EMPTY_GUEST_FORM, primaryGuestName: 'Ramesh Patel' },
      { defaultCountryCode: '91' }
    );
    expect(guest.invitationDisplayName).toBe('Ramesh Patel');
  });

  it('always flags a guest whose number cannot be used', () => {
    const guest = formValuesToGuest(
      { ...EMPTY_GUEST_FORM, primaryGuestName: 'Kiran', rawPhone: '98765', needsReview: false },
      { defaultCountryCode: '91' }
    );
    expect(guest.needsReview).toBe(true);
    expect(guest.lastError).toBeTruthy();
  });

  it('keeps the id and sending history when an existing guest is edited', () => {
    const original = formValuesToGuest(
      { ...EMPTY_GUEST_FORM, primaryGuestName: 'Ramesh', rawPhone: '9876543210' },
      { defaultCountryCode: '91' }
    );
    const withHistory = { ...original, sentConfirmedAt: '2026-06-01T00:00:00.000Z' };
    const edited = formValuesToGuest(
      { ...guestToFormValues(withHistory), village: 'Kahoda' },
      { existing: withHistory, defaultCountryCode: '91' }
    );
    expect(edited.id).toBe(original.id);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.sentConfirmedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(edited.village).toBe('Kahoda');
  });
});

describe('import record building', () => {
  it('marks a flagged import as Needs Review', () => {
    const row = prepare([['Ramesh Patel', '9876543210', 'Kahoda']])[0];
    const guest = draftToGuest(row!.draft!, { importBatchId: 'batch-1', flagForReview: true });
    expect(guest.invitationStatus).toBe('Needs Review');
    expect(guest.needsReview).toBe(true);
    expect(guest.importBatchId).toBe('batch-1');
  });

  it('imports a clean row as Pending', () => {
    const row = prepare([['Ramesh Patel', '9876543210', 'Kahoda']])[0];
    const guest = draftToGuest(row!.draft!, { importBatchId: 'batch-1', flagForReview: false });
    expect(guest.invitationStatus).toBe('Pending');
  });

  it('replacing keeps the existing id and never resets confirmed sending', () => {
    const existing = formValuesToGuest(
      { ...EMPTY_GUEST_FORM, primaryGuestName: 'Old name', rawPhone: '9876543210', invitationStatus: 'Sent Confirmed Manually' },
      { defaultCountryCode: '91' }
    );
    const row = prepare([['New name', '9876543210', 'Kahoda']])[0];
    const replaced = applyDraftToExisting(existing, row!.draft!, 'batch-2');
    expect(replaced.id).toBe(existing.id);
    expect(replaced.primaryGuestName).toBe('New name');
    expect(replaced.invitationStatus).toBe('Sent Confirmed Manually');
    expect(replaced.importBatchId).toBe('batch-2');
  });
});

describe('buildIssueCsv', () => {
  it('lists every row that needs attention with its reason', () => {
    const rows = prepare([
      ['Ramesh Patel', '9876543210', 'Kahoda'],
      ['Kiran', '98765', 'Unjha'],
      ['', '', ''],
      ['', '', 'Visnagar'],
    ]);
    const csv = buildIssueCsv(rows, headers);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Row,Guest Name,WhatsApp Number,Village,Result,Reason');
    expect(lines).toHaveLength(3);
    expect(csv).toContain('Imported with a warning');
    expect(csv).toContain('Not imported');
    expect(csv).not.toContain('Ramesh Patel');
  });
});
