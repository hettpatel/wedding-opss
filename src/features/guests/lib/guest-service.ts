import { getDb } from '@/lib/db/db';
import { createRecord, touchRecord } from '@/lib/db/records';
import { repositories, logAppError } from '@/lib/db/repositories';
import { nowIso } from '@/lib/format/date';
import type {
  GuestHousehold,
  GuestImportBatch,
  GuestImportError,
  InvitationStatus,
} from '@/lib/models';
import type { ColumnMapping } from './column-mapping';
import { fieldLabel, type PreparedRow } from './guest-import';
import type { ImportPlan } from './duplicate-review';
import { applyDraftToExisting, draftToGuest } from './guest-mapping';

export async function saveGuest(guest: GuestHousehold): Promise<GuestHousehold> {
  return repositories.guests.put(guest);
}

export async function deleteGuest(id: string): Promise<void> {
  await repositories.guests.remove(id);
}

export async function deleteGuests(ids: string[]): Promise<void> {
  const db = getDb();
  await db.guests.bulkDelete(ids);
}

export async function setGuestStatus(
  ids: string[],
  status: InvitationStatus
): Promise<GuestHousehold[]> {
  const db = getDb();
  const guests = await db.guests.bulkGet(ids);
  const updated = guests
    .filter((guest): guest is GuestHousehold => Boolean(guest))
    .map((guest) =>
      touchRecord(guest, {
        invitationStatus: status,
        // Only an explicit confirmation records a send time.
        sentConfirmedAt:
          status === 'Sent Confirmed Manually' ? (guest.sentConfirmedAt ?? nowIso()) : guest.sentConfirmedAt,
        needsReview: status === 'Needs Review' ? true : guest.needsReview,
      })
    );
  await db.guests.bulkPut(updated);
  return updated;
}

export async function clearNeedsReview(ids: string[]): Promise<GuestHousehold[]> {
  const db = getDb();
  const guests = await db.guests.bulkGet(ids);
  const updated = guests
    .filter((guest): guest is GuestHousehold => Boolean(guest))
    .map((guest) =>
      touchRecord(guest, {
        needsReview: false,
        invitationStatus: guest.invitationStatus === 'Needs Review' ? 'Pending' : guest.invitationStatus,
        lastError: null,
      })
    );
  await db.guests.bulkPut(updated);
  return updated;
}

/** Restores exact earlier copies of guest records. Used by Undo after a bulk change. */
export async function restoreGuests(snapshots: GuestHousehold[]): Promise<void> {
  await getDb().guests.bulkPut(snapshots);
}

export interface CommitImportInput {
  plan: ImportPlan;
  prepared: PreparedRow[];
  fileName: string;
  sheetName: string | null;
  headers: string[];
  mapping: ColumnMapping;
}

export interface CommitImportResult {
  batchId: string;
  created: number;
  replaced: number;
  flagged: number;
  skipped: number;
  rejected: number;
}

/**
 * Writes an import in one transaction. Every write is something the person chose in the
 * preview: nothing is created, replaced or skipped that is not in the plan.
 */
export async function commitImport(input: CommitImportInput): Promise<CommitImportResult> {
  const db = getDb();
  const batchId = createRecord<GuestImportBatch>({
    fileName: input.fileName,
    sheetName: input.sheetName,
    totalRows: input.prepared.length,
    importedRows: input.plan.created + input.plan.flagged + input.plan.replaced,
    warningRows: input.prepared.filter((row) => row.status === 'warning').length,
    rejectedRows: input.prepared.filter((row) => row.status === 'rejected').length,
    columnMapping: Object.fromEntries(
      Object.entries(input.mapping).map(([field, index]) => [
        field,
        index === null ? null : (input.headers[index] ?? `Column ${index + 1}`),
      ])
    ),
  });

  const errors: GuestImportError[] = input.prepared
    .filter((row) => row.issues.length > 0)
    .map((row) =>
      createRecord<GuestImportError>({
        batchId: batchId.id,
        rowNumber: row.rowNumber,
        severity: row.status === 'rejected' ? 'rejected' : 'warning',
        reason: row.issues.map((issue) => `${fieldLabel(issue.field)}: ${issue.message}`).join(' | '),
        rowData: row.raw,
      })
    );

  try {
    await db.transaction('rw', db.guests, db.guestImportBatches, db.guestImportErrors, async () => {
      await db.guestImportBatches.put(batchId);
      if (errors.length > 0) await db.guestImportErrors.bulkPut(errors);

      const toCreate: GuestHousehold[] = [];

      for (const action of input.plan.actions) {
        if (!action.row.draft) continue;

        if (action.kind === 'replace' && action.replaceExistingId) {
          const existing = await db.guests.get(action.replaceExistingId);
          if (!existing) {
            // The guest disappeared between preview and confirm: add rather than lose the row.
            toCreate.push(draftToGuest(action.row.draft, { importBatchId: batchId.id, flagForReview: true }));
            continue;
          }
          toCreate.push(applyDraftToExisting(existing, action.row.draft, batchId.id));
          continue;
        }

        toCreate.push(
          draftToGuest(action.row.draft, {
            importBatchId: batchId.id,
            flagForReview: action.kind === 'create-flagged',
          })
        );
      }

      if (toCreate.length > 0) await db.guests.bulkPut(toCreate);
    });
  } catch (error) {
    await logAppError('import', 'The guest import could not be saved', error);
    throw error;
  }

  return {
    batchId: batchId.id,
    created: input.plan.created,
    replaced: input.plan.replaced,
    flagged: input.plan.flagged,
    skipped: input.plan.skippedDuplicates,
    rejected: input.plan.rejected,
  };
}
