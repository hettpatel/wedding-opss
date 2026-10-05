import { describe, expect, it } from 'vitest';
import { detectHeaderRow, mappingIssues, suggestMapping, EMPTY_MAPPING } from './column-mapping';

describe('detectHeaderRow', () => {
  it('finds the header when it is the first row', () => {
    expect(detectHeaderRow([['Guest Name', 'WhatsApp Number'], ['Ramesh', '98765']])).toBe(0);
  });

  it('skips title and blank rows above the header', () => {
    const rows = [
      ['Patel family wedding list', '', ''],
      ['', '', ''],
      ['Guest Name', 'WhatsApp Number', 'Village'],
      ['Ramesh Patel', '9876543210', 'Kahoda'],
    ];
    expect(detectHeaderRow(rows)).toBe(2);
  });

  it('does not mistake a row of numbers for the header', () => {
    const rows = [
      ['Guest Name', 'Guest Count'],
      ['1', '4'],
      ['2', '6'],
    ];
    expect(detectHeaderRow(rows)).toBe(0);
  });
});

describe('suggestMapping', () => {
  it('matches the suggested column names', () => {
    const mapping = suggestMapping([
      'Guest Name',
      'Display Name',
      'WhatsApp Number',
      'Village/City',
      'Side',
      'Guest Count',
      'Notes',
    ]);
    expect(mapping).toEqual({
      primaryGuestName: 0,
      invitationDisplayName: 1,
      phone: 2,
      village: 3,
      side: 4,
      guestCount: 5,
      notes: 6,
    });
  });

  it('matches looser real-world headings', () => {
    const mapping = suggestMapping(['NAME', 'Mobile No', 'City', 'Remarks']);
    expect(mapping.primaryGuestName).toBe(0);
    expect(mapping.phone).toBe(1);
    expect(mapping.village).toBe(2);
    expect(mapping.notes).toBe(3);
  });

  it('leaves unknown columns unmapped rather than guessing', () => {
    const mapping = suggestMapping(['Column A', 'Column B']);
    expect(mapping).toEqual(EMPTY_MAPPING);
  });

  it('never maps two fields to the same column', () => {
    const mapping = suggestMapping(['Name', 'Name']);
    expect(mapping.primaryGuestName).toBe(0);
    expect(mapping.invitationDisplayName).toBeNull();
  });
});

describe('mappingIssues', () => {
  it('insists on a name column and warns about a missing phone column', () => {
    const issues = mappingIssues(EMPTY_MAPPING);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain('guest name');
  });

  it('is happy once name and phone are mapped', () => {
    expect(mappingIssues({ ...EMPTY_MAPPING, primaryGuestName: 0, phone: 1 })).toHaveLength(0);
  });
});
