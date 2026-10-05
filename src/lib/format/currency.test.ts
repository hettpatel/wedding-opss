import { describe, expect, it } from 'vitest';
import { parseInrAmount } from './currency';

describe('parseInrAmount', () => {
  it('reads plain and punctuated numbers', () => {
    expect(parseInrAmount('75000')).toBe(75000);
    expect(parseInrAmount('75,000')).toBe(75000);
    expect(parseInrAmount('₹75,000')).toBe(75000);
    expect(parseInrAmount('Rs. 75000')).toBe(75000);
  });

  it('applies Indian scale words', () => {
    expect(parseInrAmount('75k')).toBe(75000);
    expect(parseInrAmount('1.5 lakh')).toBe(150000);
    expect(parseInrAmount('2 lac')).toBe(200000);
    expect(parseInrAmount('1 crore')).toBe(10000000);
  });

  it('returns null when there is no number', () => {
    expect(parseInrAmount('budget not decided')).toBeNull();
    expect(parseInrAmount('')).toBeNull();
  });
});
