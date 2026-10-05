import { z } from 'zod';
import { baseRecordSchema, isoDateTimeSchema } from './common';

export const backupRecordCountsSchema = z.record(z.string(), z.number().int().nonnegative());

export const appBackupSchema = z.object({
  format: z.literal('wedding-ops-backup'),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string(),
  exportedAt: isoDateTimeSchema,
  counts: backupRecordCountsSchema,
  /** Table name -> rows. Blobs are stored as base64 so the file stays plain JSON. */
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type AppBackup = z.infer<typeof appBackupSchema>;

export const backupMetaSchema = baseRecordSchema.extend({
  fileName: z.string(),
  exportedAt: isoDateTimeSchema,
  counts: backupRecordCountsSchema,
  sizeBytes: z.number().nonnegative(),
  kind: z.enum(['export', 'pre-restore-safety']),
});
export type BackupMeta = z.infer<typeof backupMetaSchema>;

export const errorLogSchema = baseRecordSchema.extend({
  area: z.enum(['import', 'pdf', 'share', 'backup', 'app']),
  message: z.string(),
  detail: z.string().nullable(),
});
export type ErrorLog = z.infer<typeof errorLogSchema>;
