import { describe, expect, it } from 'vitest';
import { deriveWeddingDate, extractExplicitDate } from './dates';

const now = new Date(2026, 5, 10);

describe('deriveWeddingDate', () => {
  it('reads the date out of the free-text event dates setting', () => {
    expect(deriveWeddingDate('12 to 14 June 2026', now)).toBe('2026-06-14');
    expect(deriveWeddingDate('14 June 2026', now)).toBe('2026-06-14');
    expect(deriveWeddingDate('20/06/2026', now)).toBe('2026-06-20');
  });

  it('returns null rather than guessing', () => {
    expect(deriveWeddingDate('')).toBeNull();
    expect(deriveWeddingDate('after the monsoon', now)).toBeNull();
    expect(deriveWeddingDate(null)).toBeNull();
  });
});

describe('extractExplicitDate', () => {
  it('reads day-first and month-first forms', () => {
    expect(extractExplicitDate('on 5 July 2026', now)?.value.iso).toBe('2026-07-05');
    expect(extractExplicitDate('on July 5 2026', now)?.value.iso).toBe('2026-07-05');
  });

  it('uses the current year and says so when no year is written', () => {
    const hit = extractExplicitDate('on 5 July', now);
    expect(hit?.value.iso).toBe('2026-07-05');
    expect(hit?.value.note).toBeTruthy();
  });
});
