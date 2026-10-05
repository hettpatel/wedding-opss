import { z } from 'zod';
import { baseRecordSchema, blobSchema, isoDateSchema } from './common';

export const vendorSchema = baseRecordSchema.extend({
  name: z.string().trim().min(1, 'Add the vendor name'),
  categoryId: z.string().nullable(),
  contactPerson: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  alternatePhone: z.string().trim().nullable(),
  village: z.string().trim().nullable(),
  notes: z.string().trim().nullable(),
  quotedAmount: z.number().nonnegative().nullable(),
  advancePaid: z.number().nonnegative().nullable(),
});
export type Vendor = z.infer<typeof vendorSchema>;

export const PAYMENT_STATUSES = ['Unpaid', 'Advance Paid', 'Paid'] as const;
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'] as const;

export const expenseSchema = baseRecordSchema.extend({
  description: z.string().trim().min(1, 'Describe the expense'),
  categoryId: z.string().nullable(),
  vendorId: z.string().nullable(),
  taskId: z.string().nullable(),
  amount: z.number().nonnegative(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentDate: isoDateSchema.nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  notes: z.string().trim().nullable(),
  receipt: blobSchema.nullable(),
  receiptFileName: z.string().nullable(),
});
export type Expense = z.infer<typeof expenseSchema>;
