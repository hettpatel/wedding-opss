/**
 * Single source of truth for moving the guest-name box between three coordinate systems:
 *   1. Percentages of the template (what we store - resolution independent)
 *   2. Screen pixels, origin top-left (what the visual editor uses)
 *   3. PDF points, origin bottom-left (what pdf-lib uses)
 */

export interface PercentBox {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export function clampPercentBox(box: PercentBox): PercentBox {
  const widthPct = clamp(box.widthPct, 1, 100);
  const heightPct = clamp(box.heightPct, 1, 100);
  return {
    widthPct,
    heightPct,
    xPct: clamp(box.xPct, 0, 100 - widthPct),
    yPct: clamp(box.yPct, 0, 100 - heightPct),
  };
}

export function percentBoxToPixels(box: PercentBox, canvas: Size): PixelBox {
  return {
    x: (box.xPct / 100) * canvas.width,
    y: (box.yPct / 100) * canvas.height,
    width: (box.widthPct / 100) * canvas.width,
    height: (box.heightPct / 100) * canvas.height,
  };
}

export function pixelsToPercentBox(box: PixelBox, canvas: Size): PercentBox {
  if (canvas.width <= 0 || canvas.height <= 0) {
    return { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 };
  }
  return clampPercentBox({
    xPct: (box.x / canvas.width) * 100,
    yPct: (box.y / canvas.height) * 100,
    widthPct: (box.width / canvas.width) * 100,
    heightPct: (box.height / canvas.height) * 100,
  });
}

/**
 * Converts the stored box to a pdf-lib rectangle. The y axis is flipped because the
 * editor measures from the top of the page and PDF measures from the bottom.
 */
export function percentBoxToPdfRect(box: PercentBox, page: Size): PixelBox {
  const width = (box.widthPct / 100) * page.width;
  const height = (box.heightPct / 100) * page.height;
  const x = (box.xPct / 100) * page.width;
  const topY = (box.yPct / 100) * page.height;
  return { x, y: page.height - topY - height, width, height };
}

/** Baselines for one or more lines, vertically centred in the box, returned top line first. */
export function pdfBaselines(rect: PixelBox, lineCount: number, lineHeight: number): number[] {
  if (lineCount <= 0) return [];
  const blockHeight = lineCount * lineHeight;
  const topOfBlock = rect.y + rect.height / 2 + blockHeight / 2;
  const baselines: number[] = [];
  for (let i = 0; i < lineCount; i += 1) {
    // 0.25 of the line height approximates the descender gap under the baseline.
    baselines.push(topOfBlock - (i + 1) * lineHeight + lineHeight * 0.25);
  }
  return baselines;
}

export function alignedX(rect: PixelBox, lineWidth: number, align: TextAlign): number {
  if (align === 'center') return rect.x + (rect.width - lineWidth) / 2;
  if (align === 'right') return rect.x + rect.width - lineWidth;
  return rect.x;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
