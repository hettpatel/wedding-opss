'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';
import type { TaskAttachment, TaskComment, WeddingTask } from '@/lib/models';

export function useTasks(): WeddingTask[] | undefined {
  return useLiveQuery(() => getDb().tasks.toArray(), []);
}

export function useTaskComments(taskId: string | null): TaskComment[] | undefined {
  return useLiveQuery(
    () => (taskId ? getDb().taskComments.where('taskId').equals(taskId).toArray() : Promise.resolve([])),
    [taskId]
  );
}

export function useTaskAttachments(taskId: string | null): TaskAttachment[] | undefined {
  return useLiveQuery(
    () =>
      taskId
        ? getDb().taskAttachments.where('taskId').equals(taskId).toArray()
        : Promise.resolve([]),
    [taskId]
  );
}
