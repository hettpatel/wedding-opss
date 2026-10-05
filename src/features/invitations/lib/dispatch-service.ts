import { getDb } from '@/lib/db/db';
import { createRecord, touchRecord } from '@/lib/db/records';
import { repositories } from '@/lib/db/repositories';
import { nowIso } from '@/lib/format/date';
import type { DispatchAttempt, GuestHousehold } from '@/lib/models';
import { applyDispatchEvent, type DispatchEvent, type DispatchMethod } from './dispatch-rules';

const OUTCOME_FOR_EVENT: Record<DispatchEvent, DispatchAttempt['outcome']> = {
  generated: 'opened',
  'share-opened': 'opened',
  'whatsapp-opened': 'opened',
  downloaded: 'opened',
  'confirmed-sent': 'confirmed-sent',
  'not-sent': 'not-sent',
  failed: 'failed',
};

export interface DispatchUpdate {
  guest: GuestHousehold;
  /** The record exactly as it was before, so the change can be undone. */
  snapshot: GuestHousehold;
}

/**
 * Records one step of sending an invitation: it updates the guest and writes a history
 * entry. Status changes go through applyDispatchEvent, which is the only thing that can
 * mark an invitation as sent, and only on an explicit confirmation.
 */
export async function recordDispatchEvent(
  guestId: string,
  event: DispatchEvent,
  method: DispatchMethod,
  options: { note?: string; errorMessage?: string } = {}
): Promise<DispatchUpdate | null> {
  const db = getDb();
  const at = nowIso();

  const attempt = createRecord<DispatchAttempt>({
    guestId,
    method,
    outcome: OUTCOME_FOR_EVENT[event],
    note: options.note ?? null,
  });

  let result: DispatchUpdate | null = null;

  await db.transaction('rw', db.guests, db.dispatchAttempts, async () => {
    // Re-read inside the transaction: the dialog may be holding an older copy from
    // before the previous step, and writing that back would lose its timestamps.
    const current = await db.guests.get(guestId);
    if (!current) return;

    const snapshot: GuestHousehold = { ...current };
    const updated = touchRecord<GuestHousehold>(
      current,
      applyDispatchEvent(current, event, at, options.errorMessage)
    );

    await db.guests.put(updated);
    await db.dispatchAttempts.put(attempt);
    result = { guest: updated, snapshot };
  });

  return result;
}

export async function undoDispatch(snapshot: GuestHousehold): Promise<void> {
  await repositories.guests.put(snapshot);
}
