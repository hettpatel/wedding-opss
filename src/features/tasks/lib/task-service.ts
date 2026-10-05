import { getDb } from '@/lib/db/db';
import { createRecord, touchRecord } from '@/lib/db/records';
import { repositories } from '@/lib/db/repositories';
import { nowIso } from '@/lib/format/date';
import { validateFile } from '@/lib/files/validate';
import type { TaskAttachment, TaskAttachmentKind, TaskComment, WeddingTask } from '@/lib/models';

export async function saveTask(task: WeddingTask): Promise<WeddingTask> {
  return repositories.tasks.put(task);
}

export async function completeTask(task: WeddingTask): Promise<WeddingTask> {
  return repositories.tasks.put(
    touchRecord(task, { status: 'Completed', completedAt: nowIso() })
  );
}

export async function reopenTask(task: WeddingTask): Promise<WeddingTask> {
  return repositories.tasks.put(touchRecord(task, { status: 'Open', completedAt: null }));
}

/** Used by Undo: restores the exact record that existed before the change. */
export async function restoreTask(task: WeddingTask): Promise<WeddingTask> {
  return repositories.tasks.put(task);
}

export async function deleteTaskWithChildren(taskId: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tasks, db.taskComments, db.taskAttachments, async () => {
    await db.taskAttachments.where('taskId').equals(taskId).delete();
    await db.taskComments.where('taskId').equals(taskId).delete();
    await db.tasks.delete(taskId);
  });
}

export interface AttachmentResult {
  ok: boolean;
  error: string | null;
}

export async function addAttachment(
  taskId: string,
  file: File,
  kind: TaskAttachmentKind
): Promise<AttachmentResult> {
  const validation = validateFile(file, 'attachment');
  if (!validation.ok) return { ok: false, error: validation.error };

  try {
    const record = createRecord<TaskAttachment>({
      taskId,
      kind,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      data: file,
    });
    await repositories.taskAttachments.put(record);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.name === 'QuotaExceededError'
          ? 'This phone has run out of storage space. Delete some photos or export a backup first.'
          : 'The file could not be saved. Try a smaller photo.',
    };
  }
}

export async function removeAttachment(attachmentId: string): Promise<void> {
  await repositories.taskAttachments.remove(attachmentId);
}

export async function addComment(taskId: string, body: string): Promise<TaskComment | null> {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const comment = createRecord<TaskComment>({ taskId, body: trimmed });
  await repositories.taskComments.put(comment);
  return comment;
}

export async function removeComment(commentId: string): Promise<void> {
  await repositories.taskComments.remove(commentId);
}
