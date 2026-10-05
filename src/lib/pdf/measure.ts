import type { FontChoice } from '@/lib/models';
import { embedChosenFont } from './font-loader';
import type { MeasureText } from './fit-text';

export interface FontMeasurer {
  measure: MeasureText;
  substituted: boolean;
  note: string | null;
}

const cache = new Map<FontChoice, Promise<FontMeasurer>>();

/**
 * Measures text with the very same embedded font the PDF will use, so the warning the
 * editor shows and the result in the file can never disagree.
 */
export function getFontMeasurer(choice: FontChoice): Promise<FontMeasurer> {
  const existing = cache.get(choice);
  if (existing) return existing;

  const created = (async (): Promise<FontMeasurer> => {
    const { PDFDocument } = await import('pdf-lib');
    const scratch = await PDFDocument.create();
    const embedded = await embedChosenFont(scratch, choice);
    return {
      measure: (text, size) => embedded.font.widthOfTextAtSize(text, size),
      substituted: embedded.substituted,
      note: embedded.note,
    };
  })();

  cache.set(choice, created);
  return created;
}
