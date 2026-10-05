import { describe, expect, it } from 'vitest';
import { fitTextToBox, wrapText } from './fit-text';

/** Monospace-style stand-in: each character is 0.5 of the font size wide. */
const measure = (text: string, fontSize: number) => text.length * fontSize * 0.5;

describe('fitTextToBox', () => {
  it('keeps a short name on one line at the chosen size', () => {
    const result = fitTextToBox('Ramesh Patel', measure, {
      maxWidth: 300,
      maxHeight: 60,
      fontSize: 28,
      minFontSize: 12,
      maxLines: 2,
      autoShrink: true,
    });
    expect(result.fits).toBe(true);
    expect(result.lines).toEqual(['Ramesh Patel']);
    expect(result.fontSize).toBe(28);
  });

  it('shrinks a long name until it fits', () => {
    const result = fitTextToBox('Mr. & Mrs. Rameshbhai Kanjibhai Patel', measure, {
      maxWidth: 200,
      maxHeight: 70,
      fontSize: 28,
      minFontSize: 10,
      maxLines: 2,
      autoShrink: true,
    });
    expect(result.fits).toBe(true);
    expect(result.fontSize).toBeLessThan(28);
  });

  it('reports overflow instead of silently cutting text', () => {
    const result = fitTextToBox('Mr. & Mrs. Rameshbhai Kanjibhai Patel and family', measure, {
      maxWidth: 60,
      maxHeight: 20,
      fontSize: 28,
      minFontSize: 20,
      maxLines: 1,
      autoShrink: true,
    });
    expect(result.fits).toBe(false);
    expect(result.overflowReason).toBeTruthy();
    expect(result.lines.join(' ')).toContain('Rameshbhai');
  });

  it('does not shrink when auto-shrink is switched off', () => {
    const result = fitTextToBox('Rameshbhai Kanjibhai Patel', measure, {
      maxWidth: 50,
      maxHeight: 40,
      fontSize: 24,
      minFontSize: 8,
      maxLines: 2,
      autoShrink: false,
    });
    expect(result.fontSize).toBe(24);
    expect(result.fits).toBe(false);
  });
});

describe('wrapText', () => {
  it('splits into at most the allowed number of lines', () => {
    const lines = wrapText('one two three four five six', measure, 20, 100, 2);
    expect(lines).toHaveLength(2);
    expect(lines.join(' ')).toBe('one two three four five six');
  });
});
