'use client';

import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/files/download';
import { formatBytes } from '@/lib/storage/quota';

/**
 * Shows the finished PDF. Most phone browsers render it inline; where they do not, the
 * download button is right there, so the person is never left with a blank frame.
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
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {url ? (
          <iframe
            src={url}
            title={`Preview of ${fileName}`}
            className="h-72 w-full border-0 bg-white"
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {fileName} · {formatBytes(blob.size)}
        </p>
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
      <p className="text-xs text-muted">
        If the preview stays blank, your browser cannot show PDFs inside a page. Download it
        and open it from your files.
      </p>
    </div>
  );
}
