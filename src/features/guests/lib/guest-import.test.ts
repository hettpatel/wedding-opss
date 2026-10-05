import { describe, expect, it } from 'vitest';
import { EMPTY_MAPPING } from './column-mapping';
import { parseGuestCount, parseSide, prepareRows, summarisePrepared } from './guest-import';

const headers = ['Guest Name', 'Display Name', 'WhatsApp Number', 'Village', 'Side', 'Guest Count', 'Notes'];
const mapping = {
  ...EMPTY_MAPPING,
  primaryGuestName: 0,
  invitationDisplayName: 1,
  phone: 2,
  village: 3,
  side: 4,
  guestCount: 5,
  notes: 6,
};

const run = (rows: string[][]) =>
  prepareRows([headers, ...rows], {
    mapping,
    headerRowIndex: 0,
    headers,
    defaultCountryCode: '91',
  });

describe('prepareRows', () => {
  it('accepts a clean row', () => {
    const [row] = run([['Ramesh Patel', 'Mr. & Mrs. Ramesh Patel', '9876543210', 'Kahoda', 'Groom', '4', '']]);
    expect(row?.status).toBe('valid');
    expect(row?.draft?.normalizedPhone).toBe('919876543210');
    expect(row?.draft?.side).toBe('Groom');
    expect(row?.draft?.expectedGuestCount).toBe(4);
    expect(row?.draft?.needsReview).toBe(false);
    expect(row?.rowNumber).toBe(2);
  });

  it('keeps a guest whose phone number is missing or wrong', () => {
    const rows = run([
      ['Hasmukh Patel', '', '', 'Kahoda', '', '', ''],
      ['Kiran Thakor', '', '98765', 'Unjha', '', '', ''],
      ['Jayanti Patel', '', 'number not available', 'Visnagar', '', '', ''],
    ]);
    for (const row of rows) {
      expect(row.status).toBe('warning');
      expect(row.draft).toBeTruthy();
      expect(row.draft?.needsReview).toBe(true);
    }
    expect(rows[0]?.draft?.primaryGuestName).toBe('Hasmukh Patel');
  });

  it('keeps the raw phone value even when it cannot be used', () => {
    const [row] = run([['Kiran', '', ' 98765 ', '', '', '', '']]);
    expect(row?.draft?.rawPhone).toBe('98765');
    expect(row?.draft?.normalizedPhone).toBeNull();
  });

  it('rejects only rows with no name at all', () => {
    const rows = run([
      ['', '', '9876543210', 'Kahoda', '', '', ''],
      ['', '', '', '', '', '', ''],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('rejected');
    expect(rows[0]?.draft).toBeNull();
  });

  it('falls back to the display name when the name column is empty', () => {
    const [row] = run([['', 'Patel Parivar', '9876543210', '', '', '', '']]);
    expect(row?.status).toBe('valid');
    expect(row?.draft?.primaryGuestName).toBe('Patel Parivar');
  });

  it('copies the guest name into the display name when that column is empty', () => {
    const [row] = run([['Ramesh Patel', '', '9876543210', '', '', '', '']]);
    expect(row?.draft?.invitationDisplayName).toBe('Ramesh Patel');
  });

  it('warns when the same number appears twice in one file', () => {
    const rows = run([
      ['Ramesh', '', '9876543210', '', '', '', ''],
      ['Suresh', '', '9876543210', '', '', '', ''],
    ]);
    expect(rows[0]?.status).toBe('valid');
    expect(rows[1]?.status).toBe('warning');
    expect(rows[1]?.issues[0]?.message).toContain('row 2');
  });

  it('warns instead of guessing when side or count make no sense', () => {
    const [row] = run([['Ramesh', '', '9876543210', '', 'maybe', 'four', '']]);
    expect(row?.draft?.side).toBe('Common');
    expect(row?.draft?.expectedGuestCount).toBeNull();
    expect(row?.issues).toHaveLength(2);
  });

  it('skips blank rows in the middle of the sheet', () => {
    const rows = run([
      ['Ramesh', '', '9876543210', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Suresh', '', '9123456780', '', '', '', ''],
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.rowNumber).toBe(4);
  });

  it('counts the outcome for the preview', () => {
    const rows = run([
      ['Ramesh', '', '9876543210', '', '', '', ''],
      ['Kiran', '', '98765', '', '', '', ''],
      ['', '', '', 'Kahoda', '', '', 'no name'],
    ]);
    expect(summarisePrepared(rows)).toEqual({ total: 3, valid: 1, warning: 1, rejected: 1 });
  });
});

describe('cell readers', () => {
  it('understands the usual words for each side', () => {
    expect(parseSide('groom').side).toBe('Groom');
    expect(parseSide('BRIDE').side).toBe('Bride');
    expect(parseSide('').recognised).toBe(true);
    expect(parseSide('unknown').recognised).toBe(false);
  });

  it('reads a guest count out of untidy text', () => {
    expect(parseGuestCount('4').count).toBe(4);
    expect(parseGuestCount('6 members').count).toBe(6);
    expect(parseGuestCount('').count).toBeNull();
    expect(parseGuestCount('few').recognised).toBe(false);
  });
});
