import { getDb } from './db';
import { DexieRepository } from './repository';
import type {
  AppSettings,
  BackupMeta,
  DispatchAttempt,
  ErrorLog,
  Expense,
  GuestHousehold,
  InvitationTemplate,
  MessageTemplate,
  TaskAttachment,
  TaskCategory,
  TaskComment,
  Vendor,
  WeddingSettings,
  WeddingTask,
} from '../models';

/** One place that knows which Dexie table backs which domain repository. */
export const repositories = {
  get tasks() {
    return new DexieRepository<WeddingTask>(getDb().tasks);
  },
  get taskCategories() {
    return new DexieRepository<TaskCategory>(getDb().taskCategories);
  },
  get taskComments() {
    return new DexieRepository<TaskComment>(getDb().taskComments);
  },
  get taskAttachments() {
    return new DexieRepository<TaskAttachment>(getDb().taskAttachments);
  },
  get vendors() {
    return new DexieRepository<Vendor>(getDb().vendors);
  },
  get expenses() {
    return new DexieRepository<Expense>(getDb().expenses);
  },
  get guests() {
    return new DexieRepository<GuestHousehold>(getDb().guests);
  },
  get invitationTemplates() {
    return new DexieRepository<InvitationTemplate>(getDb().invitationTemplates);
  },
  get messageTemplates() {
    return new DexieRepository<MessageTemplate>(getDb().messageTemplates);
  },
  get dispatchAttempts() {
    return new DexieRepository<DispatchAttempt>(getDb().dispatchAttempts);
  },
  get weddingSettings() {
    return new DexieRepository<WeddingSettings>(getDb().weddingSettings);
  },
  get appSettings() {
    return new DexieRepository<AppSettings>(getDb().appSettings);
  },
  get backups() {
    return new DexieRepository<BackupMeta>(getDb().backups);
  },
  get errorLogs() {
    return new DexieRepository<ErrorLog>(getDb().errorLogs);
  },
};

export async function logAppError(
  area: ErrorLog['area'],
  message: string,
  detail?: unknown
): Promise<void> {
  try {
    const { createRecord } = await import('./records');
    await repositories.errorLogs.put(
      createRecord<ErrorLog>({
        area,
        message,
        detail: detail ? String(detail).slice(0, 2000) : null,
      })
    );
  } catch {
    // Logging must never break the action the person was performing.
  }
}
