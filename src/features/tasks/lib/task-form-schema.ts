import { z } from 'zod';
import { parseInrAmount } from '@/lib/format/currency';
import { ISO_DATE_PATTERN } from '@/lib/format/date';
import { normalizePhone } from '@/lib/format/phone';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/models';
import type { TaskFormValues } from './task-mapping';

export * from './task-mapping';

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || ISO_DATE_PATTERN.test(value), 'Enter a valid date');

const optionalMoney = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || parseInrAmount(value) !== null,
    'Enter an amount like 75000, 75k or 1.5 lakh'
  );

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => {
    if (value === '') return true;
    const status = normalizePhone(value).status;
    return status === 'ok' || status === 'landline';
  }, 'Check this number. Indian mobile numbers have 10 digits.');

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Write what needs to be done'),
    categoryId: z.string().min(1, 'Choose a category'),
    priority: z.enum(TASK_PRIORITIES),
    status: z.enum(TASK_STATUSES),
    targetDate: optionalDate,
    reminderDate: optionalDate,
    assignedTo: z.string().trim().max(80, 'Keep this short'),
    details: z.string().trim(),
    blockerReason: z.string().trim(),
    vendorName: z.string().trim().max(120, 'Keep this short'),
    vendorPhone: optionalPhone,
    estimatedExpense: optionalMoney,
    actualExpense: optionalMoney,
    quantityValue: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
        'Enter a number, for example 50'
      ),
    quantityUnit: z.string().trim().max(20, 'Keep the unit short'),
    completionNotes: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.status === 'Blocked' && !values.blockerReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blockerReason'],
        message: 'Say what is blocking this, so you remember later',
      });
    }
    if (values.status === 'Completed' && !values.title.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Write what needs to be done',
      });
    }
    if (values.reminderDate && values.targetDate && values.reminderDate > values.targetDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reminderDate'],
        message: 'The reminder is after the target date',
      });
    }
  });

type SchemaValues = z.infer<typeof taskFormSchema>;
type Assert<T extends true> = T;

/** Fails the build if the schema and the hand-written form type ever drift apart. */
type _SchemaMatchesFormValues = Assert<
  SchemaValues extends TaskFormValues ? (TaskFormValues extends SchemaValues ? true : false) : false
>;
