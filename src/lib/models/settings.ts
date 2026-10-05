import { z } from 'zod';
import { baseRecordSchema, isoDateTimeSchema } from './common';
import { DEFAULT_MESSAGE_TEMPLATE } from '../message/merge';

export const SETTINGS_SINGLETON_ID = 'default';

export const weddingSettingsSchema = baseRecordSchema.extend({
  eventDates: z.string().trim(),
  venueName: z.string().trim(),
  venueAddress: z.string().trim(),
  mapLink: z.string().trim().refine(
    (value) => value === '' || /^https?:\/\//i.test(value),
    'Map links start with https://'
  ),
  groomName: z.string().trim(),
  brideName: z.string().trim(),
});
export type WeddingSettings = z.infer<typeof weddingSettingsSchema>;

export const appSettingsSchema = baseRecordSchema.extend({
  defaultCountryCode: z.string().regex(/^\d{1,4}$/, 'Use digits only, for example 91'),
  lastBackupAt: isoDateTimeSchema.nullable(),
  backupReminderDays: z.number().int().positive(),
  demoDataLoadedAt: isoDateTimeSchema.nullable(),
  hasSeenInstallHint: z.boolean(),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const messageTemplateSchema = baseRecordSchema.extend({
  name: z.string().trim().min(1),
  body: z.string().trim().min(1, 'The message cannot be empty'),
  isDefault: z.boolean(),
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const DEFAULT_WEDDING_SETTINGS = {
  eventDates: '',
  venueName: '',
  venueAddress: 'Kahoda, Mehsana district, Gujarat',
  mapLink: '',
  groomName: '',
  brideName: '',
};

export const DEFAULT_APP_SETTINGS = {
  defaultCountryCode: '91',
  lastBackupAt: null,
  backupReminderDays: 7,
  demoDataLoadedAt: null,
  hasSeenInstallHint: false,
};

export { DEFAULT_MESSAGE_TEMPLATE };
