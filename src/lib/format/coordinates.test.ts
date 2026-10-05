import { describe, expect, it } from 'vitest';
import {
  alignedX,
  clampPercentBox,
  pdfBaselines,
  percentBoxToPdfRect,
  percentBoxToPixels,
  pixelsToPercentBox,
} from './coordinates';

const box = { xPct: 10, yPct: 20, widthPct: 50, heightPct: 10 };

describe('coordinate conversion', () => {
  it('maps percentages to editor pixels', () => {
    const pixels = percentBoxToPixels(box, { width: 400, height: 600 });
    expect(pixels).toEqual({ x: 40, y: 120, width: 200, height: 60 });
  });

  it('round-trips pixels back to percentages', () => {
    const canvas = { width: 400, height: 600 };
    const result = pixelsToPercentBox(percentBoxToPixels(box, canvas), canvas);
    expect(result.xPct).toBeCloseTo(box.xPct);
    expect(result.yPct).toBeCloseTo(box.yPct);
    expect(result.widthPct).toBeCloseTo(box.widthPct);
    expect(result.heightPct).toBeCloseTo(box.heightPct);
  });

  it('flips the y axis for PDF coordinates', () => {
    const rect = percentBoxToPdfRect(box, { width: 400, height: 600 });
    expect(rect.x).toBe(40);
    expect(rect.width).toBe(200);
    expect(rect.height).toBe(60);
    // top edge is 120 from the top, so the bottom edge is 600 - 120 - 60 = 420
    expect(rect.y).toBe(420);
  });

  it('gives the same place on the page whatever the screen size', () => {
    // The editor may be 320px wide on a phone or 900px on a laptop; the stored
    // percentages must resolve to the same spot on the printed page either way.
    const page = { width: 1240, height: 1754 };
    const expected = percentBoxToPdfRect(box, page);

    for (const canvas of [{ width: 320, height: 452 }, { width: 900, height: 1273 }]) {
      const roundTripped = pixelsToPercentBox(percentBoxToPixels(box, canvas), canvas);
      const rect = percentBoxToPdfRect(roundTripped, page);
      expect(rect.x).toBeCloseTo(expected.x);
      expect(rect.y).toBeCloseTo(expected.y);
      expect(rect.width).toBeCloseTo(expected.width);
      expect(rect.height).toBeCloseTo(expected.height);
    }
  });

  it('keeps the box inside the page', () => {
    const clamped = clampPercentBox({ xPct: 90, yPct: -10, widthPct: 50, heightPct: 20 });
    expect(clamped.xPct).toBe(50);
    expect(clamped.yPct).toBe(0);
  });

  it('centres a block of lines vertically and aligns horizontally', () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 };
    const baselines = pdfBaselines(rect, 2, 20);
    expect(baselines).toHaveLength(2);
    expect(baselines[0]).toBeGreaterThan(baselines[1] as number);
    expect(alignedX(rect, 100, 'center')).toBe(50);
    expect(alignedX(rect, 100, 'right')).toBe(100);
    expect(alignedX(rect, 100, 'left')).toBe(0);
  });
});
