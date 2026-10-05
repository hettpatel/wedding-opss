'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';
import type { GuestHousehold } from '@/lib/models';

export function useGuests(): GuestHousehold[] | undefined {
  return useLiveQuery(() => getDb().guests.toArray(), []);
}
