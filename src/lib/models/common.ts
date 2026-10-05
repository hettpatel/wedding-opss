import { z } from 'zod';

export { SCHEMA_VERSION } from '../constants';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_REGEX, 'Enter a valid date');

export const isoDateTimeSchema = z.string().min(1);

/** Separates demo records from real ones so demo data can be removed cleanly. */
export const recordSourceSchema = z.enum(['user', 'demo']);
export type RecordSource = z.infer<typeof recordSourceSchema>;

export const baseRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  schemaVersion: z.number().int().positive(),
  source: recordSourceSchema,
});

export type BaseRecord = z.infer<typeof baseRecordSchema>;

export const blobSchema = z.custom<Blob>(
  (value) => typeof Blob !== 'undefined' && value instanceof Blob,
  { message: 'Expected a file' }
);
