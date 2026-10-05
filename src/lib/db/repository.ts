import type { Table } from 'dexie';
import type { BaseRecord } from '../models/common';
import { touchRecord } from './records';

/**
 * Storage contract used by every feature. The UI depends on this interface only,
 * so an optional cloud adapter can be added later without touching components.
 */
export interface Repository<T extends BaseRecord> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(record: T): Promise<T>;
  update(id: string, changes: Partial<T>): Promise<T | undefined>;
  bulkPut(records: T[]): Promise<void>;
  remove(id: string): Promise<void>;
  removeWhere(predicate: (record: T) => boolean): Promise<number>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export class DexieRepository<T extends BaseRecord> implements Repository<T> {
  private readonly table: Table<T, string>;

  constructor(table: Table<T, string>) {
    this.table = table;
  }

  all(): Promise<T[]> {
    return this.table.toArray();
  }

  get(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async put(record: T): Promise<T> {
    await this.table.put(record);
    return record;
  }

  async update(id: string, changes: Partial<T>): Promise<T | undefined> {
    const existing = await this.table.get(id);
    if (!existing) return undefined;
    const next = touchRecord<T>(existing, changes);
    await this.table.put(next);
    return next;
  }

  async bulkPut(records: T[]): Promise<void> {
    await this.table.bulkPut(records);
  }

  async remove(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async removeWhere(predicate: (record: T) => boolean): Promise<number> {
    const matching = (await this.table.toArray()).filter(predicate);
    if (matching.length === 0) return 0;
    await this.table.bulkDelete(matching.map((record) => record.id));
    return matching.length;
  }

  count(): Promise<number> {
    return this.table.count();
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
