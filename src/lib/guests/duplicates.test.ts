import { describe, expect, it } from 'vitest';
import { findDuplicates, nameSimilarity, normalizeName } from './duplicates';

const existing = [
  {
    id: 'g1',
    primaryGuestName: 'Rameshbhai Patel',
    invitationDisplayName: 'Mr. & Mrs. Rameshbhai Patel',
    normalizedPhone: '919876543210',
    village: 'Kahoda',
  },
  {
    id: 'g2',
    primaryGuestName: 'Dinesh Chaudhary',
    invitationDisplayName: 'Dinesh Chaudhary',
    normalizedPhone: '919123456780',
    village: 'Mehsana',
  },
];

describe('duplicate detection', () => {
  it('treats the same phone number as a certain duplicate', () => {
    const matches = findDuplicates(
      { primaryGuestName: 'R Patel', normalizedPhone: '919876543210', village: 'Visnagar' },
      existing
    );
    expect(matches[0]?.existingId).toBe('g1');
    expect(matches[0]?.reason).toBe('phone');
    expect(matches[0]?.confidence).toBe(1);
  });

  it('matches the same invitation name', () => {
    const matches = findDuplicates(
      {
        primaryGuestName: 'Someone Else',
        invitationDisplayName: 'Mr & Mrs Rameshbhai Patel',
        normalizedPhone: '919000000000',
        village: 'Unknown',
      },
      existing
    );
    expect(matches[0]?.reason).toBe('display-name');
  });

  it('flags a near-identical name in the same village', () => {
    const matches = findDuplicates(
      { primaryGuestName: 'Ramesh bhai Patel', village: 'Kahoda', normalizedPhone: null },
      existing
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.existingId).toBe('g1');
  });

  it('does not flag clearly different guests', () => {
    const matches = findDuplicates(
      { primaryGuestName: 'Kiran Thakor', village: 'Visnagar', normalizedPhone: '919555000111' },
      existing
    );
    expect(matches).toHaveLength(0);
  });

  it('normalises honorifics before comparing', () => {
    expect(normalizeName('Mr. & Mrs. Ramesh Patel')).toBe('ramesh patel');
    expect(nameSimilarity('Ramesh Patel', 'ramesh  patel')).toBe(1);
  });
});
