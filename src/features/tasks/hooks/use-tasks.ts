'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';
import type { TaskAttachment, TaskComment, WeddingTask } from '@/lib/models';

export function useTasks(): WeddingTask[] | undefined {
  return useLiveQuery(() => getDb().tasks.toArray(), []);
}

export function useTaskComments(taskId: string | null): TaskComment[] | undefined {
  return useLiveQuery<TaskComment[]>(
    () =>
      taskId
        ? getDb().taskComments.where('taskId').equals(taskId).toArray()
        : Promise.resolve<TaskComment[]>([]),
    [taskId]
  );
}

export function useTaskAttachments(taskId: string | null): TaskAttachment[] | undefined {
  return useLiveQuery<TaskAttachment[]>(
    () =>
      taskId
        ? getDb().taskAttachments.where('taskId').equals(taskId).toArray()
        : Promise.resolve<TaskAttachment[]>([]),
    [taskId]
  );
}
