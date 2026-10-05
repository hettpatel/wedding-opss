import type { PDFDocument, PDFFont } from 'pdf-lib';
import { withBasePath } from '@/lib/base-path';
import type { FontChoice } from '@/lib/models';
import { FONT_FALLBACK_STANDARD, FONT_FILES } from './fonts';

export interface EmbeddedFont {
  font: PDFFont;
  /** The bundled file actually used, or null when a built-in PDF font stood in. */
  filePath: string | null;
  substituted: boolean;
  /** Plain-English note when the chosen font could not be used. Null when all is well. */
  note: string | null;
}

const byteCache = new Map<string, Uint8Array | null>();

async function loadFontBytes(path: string): Promise<Uint8Array | null> {
  if (byteCache.has(path)) return byteCache.get(path) ?? null;

  try {
    const response = await fetch(withBasePath(path));
    if (!response.ok) {
      byteCache.set(path, null);
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    byteCache.set(path, bytes);
    return bytes;
  } catch {
    // Offline and not in the cache yet, or the file is missing.
    byteCache.set(path, null);
    return null;
  }
}

const fontkitRegistered = new WeakSet<PDFDocument>();

/**
 * Embeds the chosen font into a document, subsetting it so one invitation stays small.
 * Falls back in two steps - a different bundled file, then a built-in PDF font - and
 * always reports which happened, so the app never quietly changes a person's font.
 */
export async function embedChosenFont(
  pdf: PDFDocument,
  choice: FontChoice
): Promise<EmbeddedFont> {
  if (!fontkitRegistered.has(pdf)) {
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    pdf.registerFontkit(fontkit);
    fontkitRegistered.add(pdf);
  }

  const candidates = FONT_FILES[choice];

  for (const [index, path] of candidates.entries()) {
    const bytes = await loadFontBytes(path);
    if (!bytes) continue;

    try {
      const font = await pdf.embedFont(bytes, { subset: true });
      return {
        font,
        filePath: path,
        substituted: index > 0,
        note:
          index > 0
            ? 'No script font file has been added, so an italic serif is used. See public/fonts/README.txt.'
            : null,
      };
    } catch {
      // Some files refuse to subset; try the whole file before moving on.
      try {
        const font = await pdf.embedFont(bytes, { subset: false });
        return { font, filePath: path, substituted: index > 0, note: null };
      } catch {
        continue;
      }
    }
  }

  const { StandardFonts } = await import('pdf-lib');
  const font = await pdf.embedFont(StandardFonts[FONT_FALLBACK_STANDARD[choice]]);
  return {
    font,
    filePath: null,
    substituted: true,
    note: 'The bundled font file could not be read, so a built-in PDF font was used instead. The name may look slightly different.',
  };
}
