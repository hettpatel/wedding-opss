'use client';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { useToast } from '@/components/ui/toast';
import type { TaskCategory } from '@/lib/models';
import {
  countTasksInCategory,
  createCategory,
  deleteCategory,
  renameCategory,
  validateCategoryName,
} from '../lib/category-service';

export function CategoryManager({
  open,
  onClose,
  categories,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  categories: TaskCategory[];
  onCreated?: (category: TaskCategory) => void;
}) {
  const { showToast } = useToast();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [removing, setRemoving] = useState<TaskCategory | null>(null);

  useEffect(() => {
    if (!open) {
      setNewName('');
      setError(null);
      setEditingId(null);
      setRemoving(null);
    }
  }, [open]);

  const add = async () => {
    const check = validateCategoryName(newName, categories);
    setError(check.error);
    if (!check.ok) return;

    setBusy(true);
    const created = await createCategory(newName);
    setBusy(false);
    if (!created) {
      setError('That category could not be added. Try a different name.');
      return;
    }
    setNewName('');
    showToast({ message: `"${created.name}" added`, tone: 'success' });
    onCreated?.(created);
  };

  const saveRename = async (id: string) => {
    setBusy(true);
    const result = await renameCategory(id, editingName);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setError(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Categories"
        description="Add your own, rename, or remove one you do not use."
        footer={
          <Button size="block" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

          <Field label="New category" htmlFor="new-category">
            <div className="flex gap-2">
              <Input
                id="new-category"
                className="min-w-0 flex-1"
                value={newName}
                placeholder="Guest Welcome Desk"
                onChange={(event) => {
                  setNewName(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void add();
                  }
                }}
              />
              <Button pending={busy} disabled={!newName.trim()} onClick={() => void add()}>
                Add
              </Button>
            </div>
          </Field>

          <ul className="divide-y divide-hairline">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2 py-2">
                {editingId === category.id ? (
                  <>
                    <Input
                      className="min-w-0 flex-1"
                      aria-label={`New name for ${category.name}`}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Save name"
                      pending={busy}
                      onClick={() => void saveRename(category.id)}
                    >
                      <Check className="h-5 w-5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-sm">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                        setError(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      disabled={categories.length < 2}
                      onClick={() => setRemoving(category)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>

      <DeleteCategoryDialog
        category={removing}
        categories={categories}
        onClose={() => setRemoving(null)}
        onDeleted={(name) => {
          setRemoving(null);
          showToast({ message: `"${name}" removed. Its tasks were moved, not deleted.` });
        }}
      />
    </>
  );
}

function DeleteCategoryDialog({
  category,
  categories,
  onClose,
  onDeleted,
}: {
  category: TaskCategory | null;
  categories: TaskCategory[];
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const others = categories.filter((item) => item.id !== category?.id);
  const [moveTo, setMoveTo] = useState('');
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!category) return;
    setMoveTo(others[0]?.id ?? '');
    setError(null);
    setTaskCount(null);
    void countTasksInCategory(category.id).then(setTaskCount);
    // Recomputed whenever a different category is chosen for deletion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (!category) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Delete "${category.name}"?`}
      footer={
        <div className="flex gap-2">
          <Button variant="quiet" size="block" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="block"
            pending={busy}
            onClick={async () => {
              setBusy(true);
              const result = await deleteCategory(category.id, moveTo);
              setBusy(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onDeleted(category.name);
            }}
          >
            Delete category
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        <p className="text-sm text-muted">
          {taskCount === null
            ? 'Checking how many tasks use this category…'
            : taskCount === 0
              ? 'No tasks use this category.'
              : `${taskCount} task${taskCount === 1 ? '' : 's'} use this category. They will be moved, not deleted.`}
        </p>

        <Field label="Move those tasks to" htmlFor="move-to">
          <Select id="move-to" value={moveTo} onChange={(event) => setMoveTo(event.target.value)}>
            {others.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
