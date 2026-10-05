import {
  alignedX,
  pdfBaselines,
  percentBoxToPdfRect,
  type PixelBox,
} from '@/lib/format/coordinates';
import { fitTextToBox, type FitResult } from './fit-text';
import { embedChosenFont } from './font-loader';
import type { InvitationTemplate } from '@/lib/models';

export interface GeneratedInvitation {
  bytes: Uint8Array;
  blob: Blob;
  fit: FitResult;
  /** True when the name had to be shrunk to fit. Not a problem, just worth showing. */
  shrunk: boolean;
  /** Set when the name still does not fit. The PDF is produced, but flagged, never silently clipped. */
  overflowWarning: string | null;
  /** Set when the requested font could not be embedded. */
  fontWarning: string | null;
  pageSize: { width: number; height: number };
}

export function hexToRgbTriplet(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const value = Number.parseInt(expanded, 16);
  if (!Number.isFinite(value) || expanded.length !== 6) return [0, 0, 0];
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/**
 * Builds one personalised invitation entirely in the browser. Nothing is stored: the
 * caller decides whether to preview, share, download or discard it, and the same
 * invitation can be rebuilt at any time from the template plus the guest's name.
 */
export async function generateInvitationPdf(
  template: InvitationTemplate,
  displayName: string
): Promise<GeneratedInvitation> {
  const { PDFDocument, rgb } = await import('pdf-lib');

  const source = new Uint8Array(await template.data.arrayBuffer());
  const pdf = await PDFDocument.create();
  let page;

  if (template.mimeType === 'application/pdf') {
    const sourcePdf = await PDFDocument.load(source);
    const index =
      Math.min(Math.max(template.placement.pageNumber, 1), sourcePdf.getPageCount()) - 1;
    const [copied] = await pdf.copyPages(sourcePdf, [index]);
    if (!copied) throw new Error('That page is not in the invitation file.');
    page = pdf.addPage(copied);
  } else {
    const image =
      template.mimeType === 'image/png' ? await pdf.embedPng(source) : await pdf.embedJpg(source);
    page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  const pageSize = { width: page.getWidth(), height: page.getHeight() };
  const rect: PixelBox = percentBoxToPdfRect(template.placement, pageSize);
  const embedded = await embedChosenFont(pdf, template.placement.fontFamily);

  const fit = fitTextToBox(
    displayName,
    (text, size) => embedded.font.widthOfTextAtSize(text, size),
    {
      maxWidth: rect.width,
      maxHeight: rect.height,
      fontSize: template.placement.fontSize,
      minFontSize: template.placement.minFontSize,
      maxLines: template.placement.maxLines,
      autoShrink: template.placement.autoShrink,
    }
  );

  const [red, green, blue] = hexToRgbTriplet(template.placement.colorHex);
  const baselines = pdfBaselines(rect, fit.lines.length, fit.lineHeight);

  fit.lines.forEach((line, index) => {
    const y = baselines[index];
    if (y === undefined) return;
    page.drawText(line, {
      x: alignedX(rect, embedded.font.widthOfTextAtSize(line, fit.fontSize), template.placement.align),
      y,
      size: fit.fontSize,
      font: embedded.font,
      color: rgb(red, green, blue),
    });
  });

  const bytes = await pdf.save();
  return {
    bytes,
    blob: new Blob([bytes], { type: 'application/pdf' }),
    fit,
    shrunk: fit.fits && fit.fontSize < template.placement.fontSize,
    overflowWarning: fit.fits ? null : fit.overflowReason,
    fontWarning: embedded.note,
    pageSize,
  };
}

export interface TemplateMeasurements {
  widthUnits: number;
  heightUnits: number;
  pageCount: number;
}

/** Reads the natural size of an uploaded template so coordinates can be stored as percentages. */
export async function readTemplateSize(file: File | Blob): Promise<TemplateMeasurements> {
  const type = file instanceof File ? file.type || guessTypeFromName(file.name) : file.type;

  if (type === 'application/pdf') {
    return readPdfPageSize(file, 1);
  }

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const size = { widthUnits: bitmap.width, heightUnits: bitmap.height, pageCount: 1 };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ widthUnits: image.naturalWidth, heightUnits: image.naturalHeight, pageCount: 1 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be opened.'));
    };
    image.src = url;
  });
}

/** Pages in one PDF can differ in size, so the chosen page is measured, not just the first. */
export async function readPdfPageSize(
  file: File | Blob,
  pageNumber: number
): Promise<TemplateMeasurements> {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
  const count = pdf.getPageCount();
  const index = Math.min(Math.max(pageNumber, 1), count) - 1;
  const page = pdf.getPage(index);
  return { widthUnits: page.getWidth(), heightUnits: page.getHeight(), pageCount: count };
}

function guessTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}
