import { z } from 'zod';
import { baseRecordSchema, blobSchema, isoDateSchema, isoDateTimeSchema } from './common';

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const TASK_STATUSES = ['Open', 'In Progress', 'Blocked', 'Completed'] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export const taskStatusSchema = z.enum(TASK_STATUSES);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskCategorySchema = baseRecordSchema.extend({
  name: z.string().trim().min(1, 'Give the category a name'),
  sortOrder: z.number().int(),
  isDefault: z.boolean(),
  keywords: z.array(z.string()),
});
export type TaskCategory = z.infer<typeof taskCategorySchema>;

export const weddingTaskSchema = baseRecordSchema.extend({
  title: z.string().trim().min(1, 'Add a short title'),
  /** The sentence exactly as the person typed or dictated it. Never overwritten. */
  originalInput: z.string(),
  categoryId: z.string().min(1, 'Choose a category'),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  targetDate: isoDateSchema.nullable(),
  reminderDate: isoDateSchema.nullable(),
  assignedTo: z.string().trim().nullable(),
  details: z.string().trim().nullable(),
  blockerReason: z.string().trim().nullable(),
  vendorId: z.string().nullable(),
  vendorName: z.string().trim().nullable(),
  vendorPhone: z.string().trim().nullable(),
  estimatedExpense: z.number().nonnegative().nullable(),
  actualExpense: z.number().nonnegative().nullable(),
  quantityValue: z.number().nullable(),
  quantityUnit: z.string().trim().nullable(),
  completionNotes: z.string().trim().nullable(),
  completedAt: isoDateTimeSchema.nullable(),
});
export type WeddingTask = z.infer<typeof weddingTaskSchema>;

export const taskCommentSchema = baseRecordSchema.extend({
  taskId: z.string().min(1),
  body: z.string().trim().min(1, 'Write a note first'),
});
export type TaskComment = z.infer<typeof taskCommentSchema>;

export const TASK_ATTACHMENT_KINDS = ['proof', 'receipt', 'other'] as const;
export const taskAttachmentKindSchema = z.enum(TASK_ATTACHMENT_KINDS);
export type TaskAttachmentKind = z.infer<typeof taskAttachmentKindSchema>;

export const taskAttachmentSchema = baseRecordSchema.extend({
  taskId: z.string().min(1),
  kind: taskAttachmentKindSchema,
  fileName: z.string().min(1),
  mimeType: z.string(),
  sizeBytes: z.number().nonnegative(),
  data: blobSchema,
});
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
