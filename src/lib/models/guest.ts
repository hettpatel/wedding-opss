import { z } from 'zod';
import { baseRecordSchema, isoDateTimeSchema } from './common';
import { DISPATCH_METHODS, GUEST_SIDES, INVITATION_STATUSES } from './enums';

export * from './enums';

export const guestSideSchema = z.enum(GUEST_SIDES);
export const invitationStatusSchema = z.enum(INVITATION_STATUSES);

export const guestHouseholdSchema = baseRecordSchema.extend({
  primaryGuestName: z.string().trim().min(1, 'Add the guest name'),
  invitationDisplayName: z.string().trim().min(1, 'Add the name to print on the invitation'),
  rawPhone: z.string().nullable(),
  normalizedPhone: z.string().nullable(),
  countryCode: z.string().nullable(),
  village: z.string().trim().nullable(),
  side: guestSideSchema,
  expectedGuestCount: z.number().int().nonnegative().nullable(),
  notes: z.string().trim().nullable(),
  invitationStatus: invitationStatusSchema,
  generatedAt: isoDateTimeSchema.nullable(),
  shareSheetOpenedAt: isoDateTimeSchema.nullable(),
  whatsAppOpenedAt: isoDateTimeSchema.nullable(),
  sentConfirmedAt: isoDateTimeSchema.nullable(),
  lastError: z.string().nullable(),
  needsReview: z.boolean(),
  importBatchId: z.string().nullable(),
});
export type GuestHousehold = z.infer<typeof guestHouseholdSchema>;

export const guestImportBatchSchema = baseRecordSchema.extend({
  fileName: z.string(),
  sheetName: z.string().nullable(),
  totalRows: z.number().int().nonnegative(),
  importedRows: z.number().int().nonnegative(),
  warningRows: z.number().int().nonnegative(),
  rejectedRows: z.number().int().nonnegative(),
  columnMapping: z.record(z.string(), z.string().nullable()),
});
export type GuestImportBatch = z.infer<typeof guestImportBatchSchema>;

export const guestImportErrorSchema = baseRecordSchema.extend({
  batchId: z.string(),
  rowNumber: z.number().int(),
  reason: z.string(),
  severity: z.enum(['warning', 'rejected']),
  rowData: z.record(z.string(), z.string()),
});
export type GuestImportError = z.infer<typeof guestImportErrorSchema>;

export const dispatchAttemptSchema = baseRecordSchema.extend({
  guestId: z.string(),
  method: z.enum(DISPATCH_METHODS),
  outcome: z.enum(['opened', 'confirmed-sent', 'not-sent', 'failed']),
  note: z.string().nullable(),
});
export type DispatchAttempt = z.infer<typeof dispatchAttemptSchema>;
