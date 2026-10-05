import { describe, expect, it } from 'vitest';
import { fitTextToBox, wrapText, type MeasureText } from './fit-text';
import { hexToRgbTriplet } from './generate-invitation';

/**
 * Stand-in for a serif face: proportional per-character widths at size 1. Not Liberation
 * Serif exactly, but proportional in the same way, which is what the algorithm cares about.
 */
const WIDTHS: Record<string, number> = {
  ' ': 0.25, '.': 0.25, ',': 0.25, '&': 0.78, "'": 0.18,
  i: 0.28, l: 0.28, j: 0.28, t: 0.31, f: 0.33, r: 0.33, s: 0.39, c: 0.44, e: 0.44, a: 0.44,
  m: 0.78, w: 0.72, M: 0.89, W: 0.94,
};
const measure: MeasureText = (text, size) =>
  [...text].reduce((total, char) => {
    const base = WIDTHS[char] ?? (char === char.toUpperCase() && /[A-Z]/.test(char) ? 0.67 : 0.5);
    return total + base * size;
  }, 0);

// A realistic card: 1000 points wide, a name box 70% of it.
const BOX = { maxWidth: 700, maxHeight: 90, fontSize: 48, minFontSize: 16 };

const NAMES = {
  veryShort: 'Ramesh',
  short: 'Ramesh Patel',
  usual: 'Mr. & Mrs. Ramesh Patel',
  long: 'Shri Jashvantbhai Maganbhai Chaudhary & Parivar',
  veryLong:
    'Shri Jashvantbhai Maganbhai Chaudhary ane Shrimati Kailashben Jashvantbhai Chaudhary & Parivar',
  oneLongWord: 'Rameshbhaikanjibhaichaudharyparivar',
};

describe('short names', () => {
  it('keeps a short name on one line at the full size', () => {
    for (const name of [NAMES.veryShort, NAMES.short]) {
      const result = fitTextToBox(name, measure, { ...BOX, maxLines: 2, autoShrink: true });
      expect(result.fits).toBe(true);
      expect(result.fontSize).toBe(BOX.fontSize);
      expect(result.lines).toEqual([name]);
    }
  });

  it('keeps the usual "Mr. & Mrs." form on one line', () => {
    const result = fitTextToBox(NAMES.usual, measure, { ...BOX, maxLines: 2, autoShrink: true });
    expect(result.fits).toBe(true);
    expect(result.lines).toHaveLength(1);
  });
});

describe('very long names', () => {
  it('shrinks a long name until it fits, rather than overflowing', () => {
    const result = fitTextToBox(NAMES.long, measure, { ...BOX, maxLines: 2, autoShrink: true });
    expect(result.fits).toBe(true);
    expect(result.fontSize).toBeLessThan(BOX.fontSize);
    expect(result.fontSize).toBeGreaterThan(BOX.minFontSize - 1);
    expect(result.lines.join(' ')).toBe(NAMES.long);
  });

  it('uses the second line before shrinking all the way down', () => {
    const result = fitTextToBox(NAMES.veryLong, measure, { ...BOX, maxLines: 2, autoShrink: true });
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.join(' ')).toBe(NAMES.veryLong);
  });

  it('never loses a word, however long the name', () => {
    for (const name of Object.values(NAMES)) {
      for (const maxLines of [1, 2, 3]) {
        const result = fitTextToBox(name, measure, { ...BOX, maxLines, autoShrink: true });
        expect(result.lines.join(' ').replace(/\s+/g, ' ')).toBe(name);
      }
    }
  });

  it('reports overflow instead of quietly clipping when nothing can be done', () => {
    const result = fitTextToBox(NAMES.veryLong, measure, {
      maxWidth: 200,
      maxHeight: 30,
      fontSize: 48,
      minFontSize: 40,
      maxLines: 1,
      autoShrink: true,
    });
    expect(result.fits).toBe(false);
    expect(result.overflowReason).toBeTruthy();
    expect(result.lines.join(' ')).toBe(NAMES.veryLong);
  });

  it('handles a single unbreakable word', () => {
    const result = fitTextToBox(NAMES.oneLongWord, measure, { ...BOX, maxLines: 2, autoShrink: true });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toBe(NAMES.oneLongWord);
    expect(result.fits || result.overflowReason !== null).toBe(true);
  });
});

describe('the no-silent-overflow rule', () => {
  it('always either fits or explains why not', () => {
    const boxes = [
      { maxWidth: 700, maxHeight: 90, fontSize: 48, minFontSize: 16, maxLines: 2, autoShrink: true },
      { maxWidth: 120, maxHeight: 24, fontSize: 48, minFontSize: 44, maxLines: 1, autoShrink: true },
      { maxWidth: 300, maxHeight: 40, fontSize: 30, minFontSize: 30, maxLines: 1, autoShrink: false },
      { maxWidth: 900, maxHeight: 200, fontSize: 60, minFontSize: 10, maxLines: 3, autoShrink: true },
    ];
    for (const name of Object.values(NAMES)) {
      for (const box of boxes) {
        const result = fitTextToBox(name, measure, box);
        expect(result.fits ? result.overflowReason === null : result.overflowReason !== null).toBe(true);
        expect(result.fontSize).toBeGreaterThan(0);
        expect(result.lines.length).toBeLessThanOrEqual(box.maxLines);
      }
    }
  });

  it('respects the minimum size instead of shrinking to nothing', () => {
    const result = fitTextToBox(NAMES.veryLong, measure, {
      maxWidth: 100,
      maxHeight: 200,
      fontSize: 48,
      minFontSize: 24,
      maxLines: 2,
      autoShrink: true,
    });
    expect(result.fontSize).toBeGreaterThan(23);
    expect(result.fits).toBe(false);
  });

  it('does not shrink at all when auto-shrink is off', () => {
    const result = fitTextToBox(NAMES.veryLong, measure, {
      ...BOX,
      maxLines: 2,
      autoShrink: false,
    });
    expect(result.fontSize).toBe(BOX.fontSize);
    expect(result.fits).toBe(false);
    expect(result.overflowReason).toBeTruthy();
  });
});

describe('wrapText', () => {
  it('fills the first line before moving to the second', () => {
    const lines = wrapText('Mr. & Mrs. Ramesh Kanjibhai Patel', measure, 40, 500, 2);
    expect(lines).toHaveLength(2);
    expect(lines.join(' ')).toBe('Mr. & Mrs. Ramesh Kanjibhai Patel');
  });
});

describe('hexToRgbTriplet', () => {
  it('reads the colours used by the app', () => {
    expect(hexToRgbTriplet('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgbTriplet('#ffffff')).toEqual([1, 1, 1]);
    const crimson = hexToRgbTriplet('#800020');
    expect(crimson[0]).toBeCloseTo(128 / 255);
    expect(crimson[2]).toBeCloseTo(32 / 255);
  });

  it('accepts the short form and falls back to black on nonsense', () => {
    expect(hexToRgbTriplet('#fff')).toEqual([1, 1, 1]);
    expect(hexToRgbTriplet('not a colour')).toEqual([0, 0, 0]);
  });
});
