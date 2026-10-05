import { getDb } from './db';
import { createRecord } from './records';
import { DEFAULT_CATEGORIES } from './default-categories';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_WEDDING_SETTINGS,
  SETTINGS_SINGLETON_ID,
  type AppSettings,
  type MessageTemplate,
  type TaskCategory,
  type WeddingSettings,
} from '../models';

/**
 * Creates the rows the app cannot function without. Safe to run on every start:
 * existing records are never overwritten.
 */
export async function ensureInitialData(): Promise<void> {
  const db = getDb();

  const categoryCount = await db.taskCategories.count();
  if (categoryCount === 0) {
    const categories: TaskCategory[] = DEFAULT_CATEGORIES.map((definition, index) =>
      createRecord<TaskCategory>({
        name: definition.name,
        keywords: definition.keywords,
        sortOrder: index,
        isDefault: true,
      })
    );
    await db.taskCategories.bulkPut(categories);
  }

  const wedding = await db.weddingSettings.get(SETTINGS_SINGLETON_ID);
  if (!wedding) {
    await db.weddingSettings.put(
      createRecord<WeddingSettings>({ id: SETTINGS_SINGLETON_ID, ...DEFAULT_WEDDING_SETTINGS })
    );
  }

  const app = await db.appSettings.get(SETTINGS_SINGLETON_ID);
  if (!app) {
    await db.appSettings.put(
      createRecord<AppSettings>({ id: SETTINGS_SINGLETON_ID, ...DEFAULT_APP_SETTINGS })
    );
  }

  const templateCount = await db.messageTemplates.count();
  if (templateCount === 0) {
    await db.messageTemplates.put(
      createRecord<MessageTemplate>({
        name: 'Invitation message',
        body: DEFAULT_MESSAGE_TEMPLATE,
        isDefault: true,
      })
    );
  }
}
