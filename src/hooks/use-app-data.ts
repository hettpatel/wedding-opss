'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';
import { SETTINGS_SINGLETON_ID, type AppSettings, type TaskCategory, type WeddingSettings } from '@/lib/models';

export { updateAppSettings, updateWeddingSettings } from '@/lib/db/settings-service';

export function useCategories(): TaskCategory[] | undefined {
  return useLiveQuery(() => getDb().taskCategories.orderBy('sortOrder').toArray(), []);
}

export function useAppSettings(): AppSettings | undefined {
  return useLiveQuery(() => getDb().appSettings.get(SETTINGS_SINGLETON_ID), []);
}

export function useWeddingSettings(): WeddingSettings | undefined {
  return useLiveQuery(() => getDb().weddingSettings.get(SETTINGS_SINGLETON_ID), []);
}
