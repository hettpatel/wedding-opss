import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { withBasePath } from '@/lib/base-path';

let pdfjsInstance: typeof import('pdfjs-dist') | null = null;

export async function getPdfJs(): Promise<typeof import('pdfjs-dist') | null> {
  if (typeof window === 'undefined') return null;
  if (!pdfjsInstance) {
    const pdfjs = await import('pdfjs-dist');
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = withBasePath('/pdf.worker.min.js');
    }
    pdfjsInstance = pdfjs;
  }
  return pdfjsInstance;
}

export async function loadPdfDocument(
  source: Blob | File | ArrayBuffer | Uint8Array
): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error('PDF viewer is only available in the browser.');

  let uint8: Uint8Array;
  if (source instanceof Blob) {
    uint8 = new Uint8Array(await source.arrayBuffer());
  } else if (source instanceof Uint8Array) {
    uint8 = source;
  } else {
    uint8 = new Uint8Array(source);
  }

  const loadingTask = pdfjs.getDocument({
    data: uint8,
  });

  return await loadingTask.promise;
}

export interface RenderResult {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Renders a PDF page directly onto a HTMLCanvasElement.
 */
export async function renderPdfPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    pixelRatio?: number;
  }
): Promise<RenderResult> {
  const safePageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
  const page: PDFPageProxy = await pdfDoc.getPage(safePageNum);
  const baseViewport = page.getViewport({ scale: 1 });

  const dpr = options?.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const cappedDpr = Math.min(Math.max(1, dpr), 2.5);

  let scale = cappedDpr;
  if (options?.maxWidth && options.maxWidth > 0) {
    const desiredScale = (options.maxWidth / baseViewport.width) * cappedDpr;
    scale = Math.min(scale, desiredScale);
  }

  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Could not get 2D canvas context');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    width: baseViewport.width,
    height: baseViewport.height,
    aspectRatio: baseViewport.width / baseViewport.height,
  };
}

/**
 * Renders a specific page of a PDF document to an image Data URL (JPEG).
 * Used for background preview in canvas and placement editors.
 */
export async function renderPdfPageToDataUrl(
  source: Blob | File | ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  maxWidth: number = 1400
): Promise<string> {
  const pdfDoc = await loadPdfDocument(source);
  try {
    const canvas = document.createElement('canvas');
    await renderPdfPageToCanvas(pdfDoc, pageNumber, canvas, {
      maxWidth,
      pixelRatio: 2,
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  } finally {
    try {
      void pdfDoc.destroy();
    } catch {
      // ignore
    }
  }
}
