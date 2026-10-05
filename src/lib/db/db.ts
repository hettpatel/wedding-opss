import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  BackupMeta,
  DispatchAttempt,
  ErrorLog,
  Expense,
  GuestHousehold,
  GuestImportBatch,
  GuestImportError,
  InvitationTemplate,
  MessageTemplate,
  TaskAttachment,
  TaskCategory,
  TaskComment,
  Vendor,
  WeddingSettings,
  WeddingTask,
} from '../models';

export class WeddingOpsDatabase extends Dexie {
  taskCategories!: Table<TaskCategory, string>;
  tasks!: Table<WeddingTask, string>;
  taskComments!: Table<TaskComment, string>;
  taskAttachments!: Table<TaskAttachment, string>;
  vendors!: Table<Vendor, string>;
  expenses!: Table<Expense, string>;
  guests!: Table<GuestHousehold, string>;
  guestImportBatches!: Table<GuestImportBatch, string>;
  guestImportErrors!: Table<GuestImportError, string>;
  invitationTemplates!: Table<InvitationTemplate, string>;
  messageTemplates!: Table<MessageTemplate, string>;
  dispatchAttempts!: Table<DispatchAttempt, string>;
  weddingSettings!: Table<WeddingSettings, string>;
  appSettings!: Table<AppSettings, string>;
  backups!: Table<BackupMeta, string>;
  errorLogs!: Table<ErrorLog, string>;

  constructor() {
    super('wedding-ops');

    this.version(1).stores({
      taskCategories: 'id, sortOrder, name, source',
      tasks: 'id, status, priority, categoryId, targetDate, updatedAt, source',
      taskComments: 'id, taskId, createdAt',
      taskAttachments: 'id, taskId, kind, createdAt',
      vendors: 'id, name, categoryId, source',
      expenses: 'id, vendorId, taskId, categoryId, paymentStatus, paymentDate, source',
      guests: 'id, primaryGuestName, normalizedPhone, village, side, invitationStatus, source',
      guestImportBatches: 'id, createdAt',
      guestImportErrors: 'id, batchId, rowNumber, severity',
      invitationTemplates: 'id, createdAt',
      messageTemplates: 'id, createdAt',
      dispatchAttempts: 'id, guestId, method, createdAt',
      weddingSettings: 'id',
      appSettings: 'id',
      backups: 'id, createdAt',
      errorLogs: 'id, area, createdAt',
    });
  }
}

/** Tables that participate in backup and restore, in a stable order. */
export const BACKUP_TABLE_NAMES = [
  'taskCategories',
  'tasks',
  'taskComments',
  'taskAttachments',
  'vendors',
  'expenses',
  'guests',
  'guestImportBatches',
  'guestImportErrors',
  'invitationTemplates',
  'messageTemplates',
  'dispatchAttempts',
  'weddingSettings',
  'appSettings',
  'errorLogs',
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

let instance: WeddingOpsDatabase | null = null;

/** Dexie only exists in the browser; keep static export and SSR from touching it. */
export function getDb(): WeddingOpsDatabase {
  if (typeof window === 'undefined') {
    throw new Error('The local database is only available in the browser.');
  }
  if (!instance) instance = new WeddingOpsDatabase();
  return instance;
}
