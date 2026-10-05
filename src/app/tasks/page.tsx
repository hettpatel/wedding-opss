'use client';

import { ListTodo, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useAttachmentCounts } from '@/hooks/use-attachment-counts';
import { useCategories, useWeddingSettings } from '@/hooks/use-app-data';
import type { WeddingTask } from '@/lib/models';
import type { ParsedTaskDraft } from '@/lib/nlp/parse-task-input';
import { NaturalLanguageComposer, draftToFormValues } from '@/features/tasks/components/nl-composer';
import { TaskDetailDialog } from '@/features/tasks/components/task-detail-dialog';
import { TaskFilterBar } from '@/features/tasks/components/task-filters';
import { TaskForm } from '@/features/tasks/components/task-form';
import { TaskList } from '@/features/tasks/components/task-list';
import { useTaskAttachments, useTaskComments, useTasks } from '@/features/tasks/hooks/use-tasks';
import {
  EMPTY_TASK_FORM,
  taskToFormValues,
  type TaskFormValues,
} from '@/features/tasks/lib/task-form-schema';
import {
  applyTaskFilters,
  applyTaskView,
  DEFAULT_TASK_FILTERS,
  TASK_VIEWS,
  type TaskFilters,
  type TaskView,
} from '@/features/tasks/lib/task-queries';
import { completeTask, reopenTask, restoreTask } from '@/features/tasks/lib/task-service';
import { deriveWeddingDate } from '@/lib/nlp/dates';

interface FormState {
  open: boolean;
  values: TaskFormValues;
  existing?: WeddingTask;
  originalInput?: string;
  uncertainFields: string[];
  missingFields: ParsedTaskDraft['missingFields'];
  notes: string[];
}

const CLOSED_FORM: FormState = {
  open: false,
  values: EMPTY_TASK_FORM,
  uncertainFields: [],
  missingFields: [],
  notes: [],
};

export default function TasksPage() {
  const tasks = useTasks();
  const categories = useCategories();
  const weddingSettings = useWeddingSettings();
  const attachmentCounts = useAttachmentCounts();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailTask = tasks?.find((task) => task.id === detailId) ?? null;
  const detailAttachments = useTaskAttachments(detailId) ?? [];
  const detailComments = useTaskComments(detailId) ?? [];

  const weddingDate = useMemo(
    () => deriveWeddingDate(weddingSettings?.eventDates),
    [weddingSettings?.eventDates]
  );

  // Dashboard cards link here with ?view=overdue and similar.
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    if (view && TASK_VIEWS.some((item) => item.id === view)) {
      setFilters((current) => ({ ...current, view: view as TaskView }));
    }
  }, []);

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const category of categories ?? []) map[category.id] = category.name;
    return map;
  }, [categories]);

  const viewCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const view of TASK_VIEWS) {
      map[view.id] = applyTaskView(tasks ?? [], view.id).length;
    }
    return map;
  }, [tasks]);

  const visible = useMemo(() => applyTaskFilters(tasks ?? [], filters), [filters, tasks]);

  const toggleComplete = async (task: WeddingTask) => {
    const previous = { ...task };
    if (task.status === 'Completed') {
      await reopenTask(task);
      showToast({
        message: 'Task reopened',
        action: { label: 'Undo', onClick: () => void restoreTask(previous) },
      });
      return;
    }
    await completeTask(task);
    showToast({
      message: 'Task marked as done',
      tone: 'success',
      action: { label: 'Undo', onClick: () => void restoreTask(previous) },
    });
  };

  const openBlankForm = () => {
    setForm({
      ...CLOSED_FORM,
      open: true,
      values: {
        ...EMPTY_TASK_FORM,
        categoryId: categories?.[categories.length - 1]?.id ?? '',
      },
    });
  };

  if (!tasks || !categories) {
    return <p className="py-10 text-center text-sm text-muted">Loading your tasks…</p>;
  }

  return (
    <div className="space-y-4">
      <NaturalLanguageComposer
        categories={categories}
        weddingDate={weddingDate}
        onReview={(draft) => {
          const fallback = categories[categories.length - 1]?.id ?? '';
          setForm({
            open: true,
            values: draftToFormValues(draft, fallback),
            originalInput: draft.originalInput,
            uncertainFields: draft.uncertainFields,
            missingFields: draft.missingFields,
            notes: draft.notes,
          });
        }}
      />

      <TaskFilterBar
        filters={filters}
        categories={categories}
        counts={viewCounts}
        onChange={setFilters}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-8 w-8" aria-hidden />}
          title={tasks.length === 0 ? 'No tasks yet' : 'Nothing matches these filters'}
          description={
            tasks.length === 0
              ? 'Write what needs to be done in the box above, then check what the app understood before saving.'
              : 'Try a different view, or clear the filters to see everything.'
          }
          action={
            tasks.length === 0 ? null : (
              <Button variant="secondary" onClick={() => setFilters(DEFAULT_TASK_FILTERS)}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {visible.length} task{visible.length === 1 ? '' : 's'}
          </p>
          <TaskList
            tasks={visible}
            categoryNames={categoryNames}
            attachmentCounts={attachmentCounts}
            onToggleComplete={(task) => void toggleComplete(task)}
            onOpen={(task) => setDetailId(task.id)}
          />
        </>
      )}

      <div aria-hidden className="h-10" />

      <div className="fixed bottom-[calc(72px_+_env(safe-area-inset-bottom))] right-4 z-30 md:bottom-6">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-raised"
          aria-label="Add a task without dictation"
          onClick={openBlankForm}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      </div>

      <TaskForm
        open={form.open}
        onClose={() => setForm(CLOSED_FORM)}
        categories={categories}
        initialValues={form.values}
        existingTask={form.existing}
        originalInput={form.originalInput}
        uncertainFields={form.uncertainFields}
        missingFields={form.missingFields}
        parserNotes={form.notes}
      />

      <TaskDetailDialog
        task={form.open ? null : detailTask}
        categoryName={detailTask ? (categoryNames[detailTask.categoryId] ?? 'Uncategorised') : ''}
        attachments={detailAttachments}
        comments={detailComments}
        onClose={() => setDetailId(null)}
        onEdit={(task) => {
          setDetailId(null);
          setForm({
            ...CLOSED_FORM,
            open: true,
            values: taskToFormValues(task),
            existing: task,
            originalInput: task.originalInput,
          });
        }}
      />
    </div>
  );
}
