import { getDb } from '@/lib/db/db';
import { createRecord, touchRecord } from '@/lib/db/records';
import { repositories } from '@/lib/db/repositories';
import type { TaskCategory } from '@/lib/models';
import { nextSortOrder, validateCategoryName, type CategoryCheck } from './category-rules';

export * from './category-rules';

export async function createCategory(name: string): Promise<TaskCategory | null> {
  const existing = await repositories.taskCategories.all();
  if (!validateCategoryName(name, existing).ok) return null;

  const category = createRecord<TaskCategory>({
    name: name.trim(),
    // Custom categories match on their own words; no extra keyword list is invented.
    keywords: [],
    sortOrder: nextSortOrder(existing),
    isDefault: false,
  });

  await repositories.taskCategories.put(category);
  return category;
}

export async function renameCategory(id: string, name: string): Promise<CategoryCheck> {
  const existing = await repositories.taskCategories.all();
  const check = validateCategoryName(name, existing, id);
  if (!check.ok) return check;

  const current = existing.find((category) => category.id === id);
  if (!current) return { ok: false, error: 'That category no longer exists' };

  await repositories.taskCategories.put(touchRecord(current, { name: name.trim() }));
  return { ok: true, error: null };
}

export async function countTasksInCategory(categoryId: string): Promise<number> {
  return getDb().tasks.where('categoryId').equals(categoryId).count();
}

/**
 * Deleting a category never deletes tasks. Tasks are moved to another category the person
 * chooses, so nothing is lost.
 */
export async function deleteCategory(id: string, moveTasksTo: string): Promise<CategoryCheck> {
  if (id === moveTasksTo) {
    return { ok: false, error: 'Choose a different category for the existing tasks' };
  }

  const db = getDb();
  const target = await db.taskCategories.get(moveTasksTo);
  if (!target) return { ok: false, error: 'Choose where the existing tasks should go' };

  await db.transaction('rw', db.tasks, db.taskCategories, async () => {
    const affected = await db.tasks.where('categoryId').equals(id).toArray();
    if (affected.length > 0) {
      await db.tasks.bulkPut(affected.map((task) => touchRecord(task, { categoryId: moveTasksTo })));
    }
    await db.taskCategories.delete(id);
  });

  return { ok: true, error: null };
}
