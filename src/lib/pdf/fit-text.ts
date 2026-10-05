/**
 * Decides how a guest name is laid out inside the invitation text box.
 * Pure on purpose: the measuring function is injected, so this is testable without
 * pdf-lib and identical between the on-screen preview and the generated PDF.
 */

export type MeasureText = (text: string, fontSize: number) => number;

export interface FitOptions {
  maxWidth: number;
  maxHeight: number;
  fontSize: number;
  minFontSize: number;
  maxLines: number;
  autoShrink: boolean;
  lineHeightRatio?: number;
}

export interface FitResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  fits: boolean;
  /** Plain-English reason shown to the user when the name cannot fit. */
  overflowReason: string | null;
}

export function fitTextToBox(text: string, measure: MeasureText, options: FitOptions): FitResult {
  const lineHeightRatio = options.lineHeightRatio ?? 1.2;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const maxLines = Math.max(1, Math.floor(options.maxLines));
  const startSize = Math.max(options.fontSize, 1);
  const floorSize = options.autoShrink
    ? Math.max(Math.min(options.minFontSize, startSize), 1)
    : startSize;

  let attempt: { lines: string[]; size: number } | null = null;

  for (let size = startSize; size >= floorSize; size -= 0.5) {
    const lines = wrapText(cleaned, measure, size, options.maxWidth, maxLines);
    attempt = { lines, size };

    const widest = lines.reduce((max, line) => Math.max(max, measure(line, size)), 0);
    const blockHeight = lines.length * size * lineHeightRatio;

    if (widest <= options.maxWidth && blockHeight <= options.maxHeight) {
      return {
        lines,
        fontSize: size,
        lineHeight: size * lineHeightRatio,
        fits: true,
        overflowReason: null,
      };
    }
    if (!options.autoShrink) break;
  }

  const fallback = attempt ?? { lines: [cleaned], size: floorSize };
  const widest = fallback.lines.reduce((max, line) => Math.max(max, measure(line, fallback.size)), 0);
  const blockHeight = fallback.lines.length * fallback.size * lineHeightRatio;

  return {
    lines: fallback.lines,
    fontSize: fallback.size,
    lineHeight: fallback.size * lineHeightRatio,
    fits: false,
    overflowReason:
      widest > options.maxWidth
        ? 'This name is too wide for the name area. Make the box wider or shorten the name.'
        : blockHeight > options.maxHeight
          ? 'This name needs more lines than the name area allows. Make the box taller.'
          : 'This name does not fit the name area.',
  };
}

/** Greedy word wrap, capped at maxLines. Over-long single words are kept whole, never cut silently. */
export function wrapText(
  text: string,
  measure: MeasureText,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(' ').filter(Boolean);
  if (words.length === 0) return [''];
  if (maxLines === 1) return [text];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  const consumed = lines.join(' ').split(' ').filter(Boolean).length;
  const remaining = words.slice(consumed).join(' ');
  lines.push(remaining || current);

  return lines.filter((line, index) => line.length > 0 || index === 0);
}
