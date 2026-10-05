'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Chip, InlineNotice } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/format/phone';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskCategory, type WeddingTask } from '@/lib/models';
import { MISSING_FIELD_LABELS, type MissingField } from '@/lib/nlp/parse-task-input';
import { formValuesToTask, taskFormSchema, type TaskFormValues } from '../lib/task-form-schema';
import { saveTask } from '../lib/task-service';
import { CategoryManager } from './category-manager';

/** Which optional field each chip opens. */
const CHIP_TARGET: Record<MissingField, keyof TaskFormValues> = {
  date: 'targetDate',
  quantity: 'quantityValue',
  vendor: 'vendorName',
  budget: 'estimatedExpense',
  phone: 'vendorPhone',
};

export function TaskForm({
  open,
  onClose,
  categories,
  initialValues,
  existingTask,
  originalInput,
  uncertainFields = [],
  missingFields = [],
  parserNotes = [],
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: TaskCategory[];
  initialValues: TaskFormValues;
  existingTask?: WeddingTask;
  originalInput?: string;
  uncertainFields?: string[];
  missingFields?: MissingField[];
  parserNotes?: string[];
  onSaved?: (task: WeddingTask) => void;
}) {
  const { showToast } = useToast();
  const [showOptional, setShowOptional] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      reset(initialValues);
      setShowOptional(
        Boolean(
          initialValues.vendorName ||
            initialValues.estimatedExpense ||
            initialValues.quantityValue ||
            initialValues.vendorPhone ||
            initialValues.assignedTo
        )
      );
      setSaveError(null);
    }
  }, [initialValues, open, reset]);

  const status = watch('status');
  const phoneValue = watch('vendorPhone');
  const phoneHint = useMemo(() => {
    if (!phoneValue?.trim()) return undefined;
    const parsed = normalizePhone(phoneValue);
    return parsed.status === 'ok' ? `Will be used as ${formatPhoneForDisplay(parsed)}` : parsed.message ?? undefined;
  }, [phoneValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const record = formValuesToTask(values, { existing: existingTask, originalInput });
      await saveTask(record);
      showToast({ message: existingTask ? 'Task updated and saved on this phone' : 'Task saved on this phone', tone: 'success' });
      onSaved?.(record);
      onClose();
    } catch (error) {
      // The dialog stays open with everything the person typed still in place.
      setSaveError(
        error instanceof Error && error.name === 'QuotaExceededError'
          ? 'This phone has run out of storage space. Export a backup and remove some photos.'
          : 'The task could not be saved. Nothing was lost - try saving again.'
      );
    }
  });

  const highlight = (field: string) => uncertainFields.includes(field);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existingTask ? 'Edit task' : 'Check the task before saving'}
      description={existingTask ? undefined : 'Change anything that is wrong, then save.'}
      footer={
        <div className="flex gap-2">
          <Button variant="quiet" size="block" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="block" onClick={() => void onSubmit()} pending={isSubmitting}>
            {existingTask ? 'Save changes' : 'Save task'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)} noValidate>
        {saveError ? <InlineNotice tone="error">{saveError}</InlineNotice> : null}

        {parserNotes.length > 0 ? (
          <InlineNotice tone="warning">
            <ul className="space-y-1">
              {parserNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </InlineNotice>
        ) : null}

        <Field label="What needs to be done" htmlFor="task-title" error={errors.title?.message}>
          <Textarea id="task-title" rows={2} {...register('title')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Category"
            htmlFor="task-category"
            error={errors.categoryId?.message}
            highlight={highlight('categoryId')}
          >
            <div className="flex gap-2">
              <Select id="task-category" className="min-w-0 flex-1" {...register('categoryId')}>
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="quiet"
                size="icon"
                aria-label="Add or edit categories"
                onClick={() => setCategoriesOpen(true)}
              >
                <FolderPlus className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </Field>

          <Field label="Priority" htmlFor="task-priority" error={errors.priority?.message}>
            <Select id="task-priority" {...register('priority')}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Target date"
            htmlFor="task-date"
            error={errors.targetDate?.message}
            highlight={highlight('targetDate')}
            hint="Leave empty if there is no fixed date"
          >
            <Input id="task-date" type="date" {...register('targetDate')} />
          </Field>

          <Field label="Status" htmlFor="task-status" error={errors.status?.message}>
            <Select id="task-status" {...register('status')}>
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {status === 'Blocked' ? (
          <Field label="What is blocking this" htmlFor="task-blocker" error={errors.blockerReason?.message}>
            <Input id="task-blocker" {...register('blockerReason')} placeholder="Waiting for the final guest count" />
          </Field>
        ) : null}

        {status === 'Completed' ? (
          <Field label="Completion notes" htmlFor="task-completion" error={errors.completionNotes?.message}>
            <Textarea id="task-completion" rows={2} {...register('completionNotes')} />
          </Field>
        ) : null}

        {missingFields.length > 0 && !showOptional ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">Add anything else you know. All of this is optional.</p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <Chip
                  key={field}
                  onClick={() => {
                    setShowOptional(true);
                    window.setTimeout(() => setFocus(CHIP_TARGET[field]), 50);
                  }}
                >
                  {MISSING_FIELD_LABELS[field]}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {!showOptional ? (
          <Button variant="quiet" size="block" onClick={() => setShowOptional(true)}>
            More details
          </Button>
        ) : (
          <div className="space-y-4 border-t border-hairline pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Vendor name"
                htmlFor="task-vendor"
                error={errors.vendorName?.message}
                highlight={highlight('vendorName')}
              >
                <Input id="task-vendor" {...register('vendorName')} />
              </Field>

              <Field
                label="Vendor phone"
                htmlFor="task-phone"
                error={errors.vendorPhone?.message}
                hint={phoneHint}
              >
                <Input id="task-phone" type="tel" inputMode="tel" {...register('vendorPhone')} />
              </Field>

              <Field
                label="Estimated expense"
                htmlFor="task-estimate"
                error={errors.estimatedExpense?.message}
                hint="For example 75000, 75k or 1.5 lakh"
                highlight={highlight('estimatedExpense')}
              >
                <Input id="task-estimate" inputMode="decimal" {...register('estimatedExpense')} />
              </Field>

              <Field label="Actual expense" htmlFor="task-actual" error={errors.actualExpense?.message}>
                <Input id="task-actual" inputMode="decimal" {...register('actualExpense')} />
              </Field>

              <Field
                label="Quantity"
                htmlFor="task-quantity"
                error={errors.quantityValue?.message}
                highlight={highlight('quantityValue')}
              >
                <Input id="task-quantity" inputMode="decimal" {...register('quantityValue')} />
              </Field>

              <Field label="Unit" htmlFor="task-unit" error={errors.quantityUnit?.message}>
                <Input id="task-unit" placeholder="kg, boxes, buses" {...register('quantityUnit')} />
              </Field>

              <Field label="Who is doing it" htmlFor="task-assigned" error={errors.assignedTo?.message}>
                <Input id="task-assigned" {...register('assignedTo')} />
              </Field>

              <Field label="Reminder date" htmlFor="task-reminder" error={errors.reminderDate?.message}>
                <Input id="task-reminder" type="date" {...register('reminderDate')} />
              </Field>
            </div>

            <Field label="Details" htmlFor="task-details" error={errors.details?.message}>
              <Textarea id="task-details" rows={3} {...register('details')} />
            </Field>
          </div>
        )}

        {originalInput ? (
          <div className="rounded-lg border border-hairline bg-surface px-3 py-2">
            <p className="text-xs font-medium text-muted">Your original words, kept with the task</p>
            <p className="mt-1 text-sm">{originalInput}</p>
          </div>
        ) : null}
      </form>

      <CategoryManager
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
        onCreated={(category) => setValue('categoryId', category.id, { shouldValidate: true })}
      />
    </Dialog>
  );
}
