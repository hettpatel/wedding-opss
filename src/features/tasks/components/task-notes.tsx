'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/form-controls';
import { formatDisplayDateTime } from '@/lib/format/date';
import type { TaskComment } from '@/lib/models';
import { addComment, removeComment } from '../lib/task-service';

export function TaskNotes({ taskId, comments }: { taskId: string; comments: TaskComment[] }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<TaskComment | null>(null);

  const ordered = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Notes</h3>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((comment) => (
            <li
              key={comment.id}
              className="flex items-start gap-2 rounded-lg border border-hairline bg-white p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDisplayDateTime(comment.createdAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete this note"
                onClick={() => setToDelete(comment)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Textarea
        aria-label="Add a note"
        rows={2}
        value={body}
        placeholder="What happened, what was agreed…"
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        variant="quiet"
        size="sm"
        disabled={!body.trim()}
        pending={busy}
        onClick={async () => {
          setBusy(true);
          await addComment(taskId, body);
          setBusy(false);
          setBody('');
        }}
      >
        Add note
      </Button>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this note?"
        description="The note will be removed from this task. This cannot be undone."
        confirmLabel="Delete note"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await removeComment(toDelete.id);
          setToDelete(null);
        }}
      />
    </section>
  );
}
