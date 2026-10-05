import { createRecord, touchRecord } from '@/lib/db/records';
import { parseInrAmount } from '@/lib/format/currency';
import { nowIso } from '@/lib/format/date';
import type { TaskPriority, TaskStatus, WeddingTask } from '@/lib/models';

/**
 * The shape of the task form. Declared by hand (rather than inferred from Zod) so the
 * conversion helpers below carry no validation dependency and stay unit testable.
 * `task-form-schema.ts` holds a compile-time check that the two never drift apart.
 */
export interface TaskFormValues {
  title: string;
  categoryId: string;
  priority: TaskPriority;
  status: TaskStatus;
  targetDate: string;
  reminderDate: string;
  assignedTo: string;
  details: string;
  blockerReason: string;
  vendorName: string;
  vendorPhone: string;
  estimatedExpense: string;
  actualExpense: string;
  quantityValue: string;
  quantityUnit: string;
  completionNotes: string;
}

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: '',
  categoryId: '',
  priority: 'Medium',
  status: 'Open',
  targetDate: '',
  reminderDate: '',
  assignedTo: '',
  details: '',
  blockerReason: '',
  vendorName: '',
  vendorPhone: '',
  estimatedExpense: '',
  actualExpense: '',
  quantityValue: '',
  quantityUnit: '',
  completionNotes: '',
};

export function taskToFormValues(task: WeddingTask): TaskFormValues {
  return {
    title: task.title,
    categoryId: task.categoryId,
    priority: task.priority,
    status: task.status,
    targetDate: task.targetDate ?? '',
    reminderDate: task.reminderDate ?? '',
    assignedTo: task.assignedTo ?? '',
    details: task.details ?? '',
    blockerReason: task.blockerReason ?? '',
    vendorName: task.vendorName ?? '',
    vendorPhone: task.vendorPhone ?? '',
    estimatedExpense: task.estimatedExpense === null ? '' : String(task.estimatedExpense),
    actualExpense: task.actualExpense === null ? '' : String(task.actualExpense),
    quantityValue: task.quantityValue === null ? '' : String(task.quantityValue),
    quantityUnit: task.quantityUnit ?? '',
    completionNotes: task.completionNotes ?? '',
  };
}

const blank = (value: string): string | null => (value.trim() === '' ? null : value.trim());

export function formValuesToTask(
  values: TaskFormValues,
  options: { existing?: WeddingTask; originalInput?: string }
): WeddingTask {
  const common = {
    title: values.title.trim(),
    categoryId: values.categoryId,
    priority: values.priority,
    status: values.status,
    targetDate: blank(values.targetDate),
    reminderDate: blank(values.reminderDate),
    assignedTo: blank(values.assignedTo),
    details: blank(values.details),
    blockerReason: blank(values.blockerReason),
    vendorName: blank(values.vendorName),
    vendorPhone: blank(values.vendorPhone),
    estimatedExpense: parseInrAmount(values.estimatedExpense),
    actualExpense: parseInrAmount(values.actualExpense),
    quantityValue: values.quantityValue.trim() === '' ? null : Number(values.quantityValue),
    quantityUnit: blank(values.quantityUnit),
    completionNotes: blank(values.completionNotes),
  };

  if (options.existing) {
    const wasCompleted = options.existing.status === 'Completed';
    const isCompleted = values.status === 'Completed';
    return touchRecord<WeddingTask>(options.existing, {
      ...common,
      // Keep the original completion time when an already-finished task is edited.
      completedAt: isCompleted ? (wasCompleted ? options.existing.completedAt : nowIso()) : null,
    });
  }

  return createRecord<WeddingTask>({
    ...common,
    originalInput: options.originalInput ?? values.title.trim(),
    vendorId: null,
    completedAt: values.status === 'Completed' ? nowIso() : null,
  });
}
