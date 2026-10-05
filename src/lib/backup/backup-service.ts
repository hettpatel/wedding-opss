import { BACKUP_TABLE_NAMES, getDb, type BackupTableName } from '@/lib/db/db';
import { createRecord } from '@/lib/db/records';
import { logAppError, repositories } from '@/lib/db/repositories';
import { backupFileName } from '@/lib/format/filename';
import { nowIso } from '@/lib/format/date';
import { base64ToBlob, blobToBase64, downloadBlob } from '@/lib/files/download';
import type { ZodTypeAny } from 'zod';
import {
  SCHEMA_VERSION,
  appBackupSchema,
  appSettingsSchema,
  dispatchAttemptSchema,
  errorLogSchema,
  expenseSchema,
  guestHouseholdSchema,
  guestImportBatchSchema,
  guestImportErrorSchema,
  invitationTemplateSchema,
  messageTemplateSchema,
  taskAttachmentSchema,
  taskCategorySchema,
  taskCommentSchema,
  vendorSchema,
  weddingSettingsSchema,
  weddingTaskSchema,
  type AppBackup,
  type BackupMeta,
} from '@/lib/models';
import { updateAppSettings } from '@/lib/db/settings-service';
import { ensureInitialData } from '@/lib/db/seed';
import { APP_VERSION } from '@/lib/constants';

const BLOB_MARKER = '__blob__';

interface EncodedBlob {
  [BLOB_MARKER]: true;
  mimeType: string;
  data: string;
}

function isEncodedBlob(value: unknown): value is EncodedBlob {
  return typeof value === 'object' && value !== null && BLOB_MARKER in value;
}

async function encodeRow(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const encoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
      encoded[key] = {
        [BLOB_MARKER]: true,
        mimeType: value.type,
        data: await blobToBase64(value),
      } satisfies EncodedBlob;
    } else {
      encoded[key] = value;
    }
  }
  return encoded;
}

function decodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    decoded[key] = isEncodedBlob(value) ? base64ToBlob(value.data, value.mimeType) : value;
  }
  return decoded;
}

export async function buildBackup(): Promise<AppBackup> {
  const db = getDb();
  const tables: Record<string, Array<Record<string, unknown>>> = {};
  const counts: Record<string, number> = {};

  for (const name of BACKUP_TABLE_NAMES) {
    const rows = (await db.table(name).toArray()) as Array<Record<string, unknown>>;
    tables[name] = await Promise.all(rows.map(encodeRow));
    counts[name] = rows.length;
  }

  return {
    format: 'wedding-ops-backup',
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowIso(),
    counts,
    tables,
  };
}

export async function exportBackupToFile(
  kind: BackupMeta['kind'] = 'export'
): Promise<{ fileName: string; sizeBytes: number }> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = backupFileName();

  downloadBlob(blob, fileName);

  await repositories.backups.put(
    createRecord<BackupMeta>({
      fileName,
      exportedAt: backup.exportedAt,
      counts: backup.counts,
      sizeBytes: blob.size,
      kind,
    })
  );

  if (kind === 'export') {
    await updateAppSettings({ lastBackupAt: backup.exportedAt });
  }

  return { fileName, sizeBytes: blob.size };
}

export interface BackupPreview {
  ok: boolean;
  error: string | null;
  backup: AppBackup | null;
  summary: Array<{ table: string; label: string; count: number }>;
}

const TABLE_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  taskCategories: 'Task categories',
  taskComments: 'Task notes',
  taskAttachments: 'Photos and receipts',
  vendors: 'Vendors',
  expenses: 'Expenses',
  guests: 'Guest households',
  guestImportBatches: 'Guest imports',
  guestImportErrors: 'Import problems',
  invitationTemplates: 'Invitation templates',
  messageTemplates: 'Message templates',
  dispatchAttempts: 'Sending history',
  weddingSettings: 'Wedding details',
  appSettings: 'App settings',
  errorLogs: 'Error log',
};

/** Reads and checks a backup file without changing anything. */
export async function previewBackupFile(file: File): Promise<BackupPreview> {
  const empty = { ok: false, backup: null, summary: [] };
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const result = appBackupSchema.safeParse(parsed);

    if (!result.success) {
      return { ...empty, error: 'This file is not a Wedding Ops backup, or it is damaged.' };
    }
    if (result.data.schemaVersion > SCHEMA_VERSION) {
      return {
        ...empty,
        error: 'This backup was made by a newer version of the app. Update the app first.',
      };
    }

    const summary = Object.entries(result.data.counts)
      .filter(([, count]) => count > 0)
      .map(([table, count]) => ({ table, label: TABLE_LABELS[table] ?? table, count }));

    return { ok: true, error: null, backup: result.data, summary };
  } catch {
    return { ...empty, error: 'This file could not be read. Choose the .json backup file.' };
  }
}

/** Every restored record is checked against the schema it was saved with. */
const VALIDATORS: Record<BackupTableName, ZodTypeAny> = {
  taskCategories: taskCategorySchema,
  tasks: weddingTaskSchema,
  taskComments: taskCommentSchema,
  taskAttachments: taskAttachmentSchema,
  vendors: vendorSchema,
  expenses: expenseSchema,
  guests: guestHouseholdSchema,
  guestImportBatches: guestImportBatchSchema,
  guestImportErrors: guestImportErrorSchema,
  invitationTemplates: invitationTemplateSchema,
  messageTemplates: messageTemplateSchema,
  dispatchAttempts: dispatchAttemptSchema,
  weddingSettings: weddingSettingsSchema,
  appSettings: appSettingsSchema,
  errorLogs: errorLogSchema,
};

export type RestoreMode = 'replace' | 'merge';

export interface RestoreResult {
  added: number;
  /** Records left alone because they already exist (merge only). */
  skipped: number;
  /** Records in the file that did not match the app's schema and were not written. */
  skippedInvalid: number;
  replacedTables: number;
}

/**
 * Restores a checked backup. "merge" never overwrites an existing record;
 * "replace" always exports a safety copy of the current data first.
 */
export async function restoreBackup(backup: AppBackup, mode: RestoreMode): Promise<RestoreResult> {
  const db = getDb();

  if (mode === 'replace') {
    await exportBackupToFile('pre-restore-safety');
  }

  let added = 0;
  let skipped = 0;
  let skippedInvalid = 0;
  let replacedTables = 0;

  for (const name of BACKUP_TABLE_NAMES) {
    const table = db.table(name as BackupTableName);
    const rows = backup.tables[name] ?? [];

    // Anything that does not match the schema is left out rather than written blindly.
    const valid: Array<Record<string, unknown>> = [];
    for (const row of rows.map(decodeRow)) {
      const checked = VALIDATORS[name].safeParse(row);
      if (checked.success) valid.push(checked.data as Record<string, unknown>);
      else skippedInvalid += 1;
    }

    if (mode === 'replace') {
      // Cleared even when the file has nothing for this table: "replace everything"
      // must not leave old records behind to mix with the restored ones.
      await table.clear();
      if (valid.length > 0) await table.bulkPut(valid);
      added += valid.length;
      replacedTables += 1;
      continue;
    }

    for (const row of valid) {
      const id = row.id as string | undefined;
      if (!id) {
        skippedInvalid += 1;
        continue;
      }
      if (await table.get(id)) {
        skipped += 1;
        continue;
      }
      await table.put(row);
      added += 1;
    }
  }

  if (skippedInvalid > 0) {
    await logAppError(
      'backup',
      `${skippedInvalid} records in the backup did not match the app and were not restored`
    );
  }

  // A backup made before settings existed must not leave the app without them.
  await ensureInitialData();

  return { added, skipped, skippedInvalid, replacedTables };
}

export function isBackupOverdue(lastBackupAt: string | null, reminderDays: number): boolean {
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last > reminderDays * 24 * 60 * 60 * 1000;
}
