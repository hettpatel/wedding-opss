import { newId } from '../ids';
import { nowIso } from '../format/date';
import { SCHEMA_VERSION } from '../constants';
import type { BaseRecord, RecordSource } from '../models/common';

export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord> &
  Partial<Pick<BaseRecord, 'id' | 'source'>>;

/** Stamps identity + audit fields so no feature has to remember to do it. */
export function createRecord<T extends BaseRecord>(input: NewRecord<T>, source: RecordSource = 'user'): T {
  const timestamp = nowIso();
  const { id, source: providedSource, ...rest } = input as NewRecord<T> & {
    id?: string;
    source?: RecordSource;
  };
  return {
    ...(rest as Omit<T, keyof BaseRecord>),
    id: id ?? newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
    source: providedSource ?? source,
  } as unknown as T;
}

export function touchRecord<T extends BaseRecord>(record: T, changes: Partial<T> = {}): T {
  return { ...record, ...changes, updatedAt: nowIso() };
}
