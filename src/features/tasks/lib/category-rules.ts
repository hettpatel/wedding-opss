import type { TaskCategory } from '@/lib/models';

export interface CategoryCheck {
  ok: boolean;
  error: string | null;
}

/** Naming rules, kept free of any storage dependency so they can be unit tested. */
export function validateCategoryName(
  name: string,
  existing: Array<Pick<TaskCategory, 'id' | 'name'>>,
  ignoreId?: string
): CategoryCheck {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Give the category a name' };
  if (trimmed.length > 40) return { ok: false, error: 'Keep the name under 40 characters' };

  const clash = existing.some(
    (category) =>
      category.id !== ignoreId && category.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (clash) return { ok: false, error: 'A category with this name already exists' };

  return { ok: true, error: null };
}

export function nextSortOrder(existing: Array<Pick<TaskCategory, 'sortOrder'>>): number {
  return existing.reduce((max, category) => Math.max(max, category.sortOrder), -1) + 1;
}
