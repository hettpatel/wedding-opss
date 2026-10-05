'use client';

import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/files/download';
import { formatBytes } from '@/lib/storage/quota';
import { loadPdfDocument, renderPdfPageToCanvas } from '@/lib/pdf/pdf-renderer';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Shows the finished PDF rendered directly onto a high-resolution canvas.
 * Works reliably on all mobile and desktop browsers including Android Chrome.
 */
export function PdfPreview({
  blob,
  fileName,
  onDownloaded,
}: {
  blob: Blob;
  fileName: string;
  onDownloaded?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPageNumber(1);

    void (async () => {
      try {
        const doc = await loadPdfDocument(blob);
        if (!active) {
          void doc.destroy();
          return;
        }
        if (pdfDocRef.current) {
          try {
            void pdfDocRef.current.destroy();
          } catch {
            // ignore
          }
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load PDF in preview:', err);
        setError('Could not render PDF preview directly.');
        setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (pdfDocRef.current) {
        try {
          void pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }
    };
  }, [blob]);

  // Render current page when doc, pageNumber or zoom changes
  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || loading) return;

    let active = true;
    void (async () => {
      try {
        await renderPdfPageToCanvas(doc, pageNumber, canvas, {
          maxWidth: 900 * zoom,
        });
      } catch (err) {
        if (active) {
          console.warn('Page render error:', err);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pageNumber, zoom, loading]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-card border border-hairline bg-surface">
        {loading ? (
          <div className="flex h-72 w-full flex-col items-center justify-center gap-2 bg-white text-sm text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-crimson" />
            <span>Loading invitation preview…</span>
          </div>
        ) : error ? (
          <div className="flex h-72 w-full flex-col items-center justify-center gap-3 bg-white p-4 text-center">
            <p className="text-sm text-muted">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                downloadBlob(blob, fileName);
                onDownloaded?.();
              }}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download to view
            </Button>
          </div>
        ) : (
          <div className="flex max-h-[460px] min-h-[280px] w-full items-center justify-center overflow-auto bg-stone-100 p-2">
            <canvas
              ref={canvasRef}
              className="max-w-full rounded shadow-sm transition-transform duration-150"
              style={{ maxHeight: '420px', width: 'auto', height: 'auto' }}
            />
          </div>
        )}

        {/* Toolbar controls */}
        {!loading && !error ? (
          <div className="flex flex-wrap items-center justify-between border-t border-hairline bg-white/95 px-3 py-1.5 text-xs backdrop-blur-sm">
            {numPages > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  className="rounded p-1 text-ink hover:bg-surface disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-1 text-muted">
                  {pageNumber} / {numPages}
                </span>
                <button
                  type="button"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                  className="rounded p-1 text-ink hover:bg-surface disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-muted">1 page</span>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
                className="rounded p-1 text-ink hover:bg-surface"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-1 text-xs text-muted hover:text-ink"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                className="rounded p-1 text-ink hover:bg-surface"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted">
          {fileName} · {formatBytes(blob.size)}
        </p>
        <div className="flex items-center gap-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-xs font-medium text-ink hover:bg-surface"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open full
            </a>
          ) : null}
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              downloadBlob(blob, fileName);
              onDownloaded?.();
            }}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

