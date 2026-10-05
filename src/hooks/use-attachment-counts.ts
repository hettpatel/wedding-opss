'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';

/** Counts attachments per task using index keys only, so photo blobs stay out of memory. */
export function useAttachmentCounts(): Record<string, number> {
  const counts = useLiveQuery(async () => {
    const keys = await getDb().taskAttachments.orderBy('taskId').keys();
    const result: Record<string, number> = {};
    for (const key of keys) {
      const taskId = String(key);
      result[taskId] = (result[taskId] ?? 0) + 1;
    }
    return result;
  }, []);

  return counts ?? {};
}
