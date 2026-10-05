'use client';

import { FileText, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/dialog';
import { acceptAttribute } from '@/lib/files/validate';
import { formatBytes } from '@/lib/storage/quota';
import type { TaskAttachment, TaskAttachmentKind } from '@/lib/models';
import { addAttachment, removeAttachment } from '../lib/task-service';

export function TaskAttachments({
  taskId,
  attachments,
}: {
  taskId: string;
  attachments: TaskAttachment[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<TaskAttachmentKind | null>(null);
  const [toDelete, setToDelete] = useState<TaskAttachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<TaskAttachmentKind>('proof');

  const pick = (kind: TaskAttachmentKind) => {
    kindRef.current = kind;
    setError(null);
    inputRef.current?.click();
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Photos and receipts</h3>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute('attachment')}
        className="sr-only"
        aria-label="Choose a photo or PDF"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setPendingKind(kindRef.current);
          const result = await addAttachment(taskId, file, kindRef.current);
          setPendingKind(null);
          if (!result.ok) setError(result.error);
        }}
      />

      <div className="flex gap-2">
        <Button variant="quiet" size="sm" pending={pendingKind === 'proof'} onClick={() => pick('proof')}>
          <Upload className="h-4 w-4" aria-hidden />
          Add proof photo
        </Button>
        <Button variant="quiet" size="sm" pending={pendingKind === 'receipt'} onClick={() => pick('receipt')}>
          <Upload className="h-4 w-4" aria-hidden />
          Add receipt
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted">Nothing attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <AttachmentRow attachment={attachment} onDelete={() => setToDelete(attachment)} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this file?"
        description={`"${toDelete?.fileName ?? ''}" will be removed from this phone. This cannot be undone.`}
        confirmLabel="Delete file"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await removeAttachment(toDelete.id);
          setToDelete(null);
        }}
      />
    </section>
  );
}

function AttachmentRow({
  attachment,
  onDelete,
}: {
  attachment: TaskAttachment;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith('image/');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(attachment.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment.data]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-white p-2">
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded bg-surface text-crimson">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{attachment.fileName}</p>
        <p className="text-xs capitalize text-muted">
          {attachment.kind} · {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-touch items-center px-2 text-sm font-medium text-crimson"
        >
          Open
        </a>
      ) : null}
      <Button variant="ghost" size="icon" aria-label={`Delete ${attachment.fileName}`} onClick={onDelete}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
