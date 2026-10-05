import { describe, expect, it } from 'vitest';
import type { Table } from 'dexie';
import type { BaseRecord } from '../models/common';
import { DexieRepository } from './repository';
import { createRecord, touchRecord } from './records';

interface Note extends BaseRecord {
  body: string;
}

/** Minimal in-memory stand-in for a Dexie table, so storage behaviour is testable. */
function fakeTable<T extends BaseRecord>(): Table<T, string> {
  const rows = new Map<string, T>();
  return {
    toArray: async () => Array.from(rows.values()),
    get: async (id: string) => rows.get(id),
    put: async (record: T) => {
      rows.set(record.id, record);
      return record.id;
    },
    bulkPut: async (records: T[]) => {
      for (const record of records) rows.set(record.id, record);
    },
    delete: async (id: string) => {
      rows.delete(id);
    },
    bulkDelete: async (ids: string[]) => {
      for (const id of ids) rows.delete(id);
    },
    count: async () => rows.size,
    clear: async () => {
      rows.clear();
    },
  } as unknown as Table<T, string>;
}

const makeNote = (body: string) => createRecord<Note>({ body });

describe('createRecord', () => {
  it('stamps identity and audit fields', () => {
    const note = makeNote('Call the decorator');
    expect(note.id.length).toBeGreaterThan(8);
    expect(note.schemaVersion).toBe(1);
    expect(note.source).toBe('user');
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it('marks demo records separately', () => {
    expect(createRecord<Note>({ body: 'demo' }, 'demo').source).toBe('demo');
  });

  it('gives every record a different id', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeNote('x').id));
    expect(ids.size).toBe(50);
  });
});

describe('touchRecord', () => {
  it('applies changes and keeps the creation time', () => {
    const note = makeNote('First');
    const updated = touchRecord(note, { body: 'Second' });
    expect(updated.body).toBe('Second');
    expect(updated.id).toBe(note.id);
    expect(updated.createdAt).toBe(note.createdAt);
  });
});

describe('DexieRepository', () => {
  it('writes and reads a record back', async () => {
    const repo = new DexieRepository<Note>(fakeTable<Note>());
    const note = makeNote('Book the buses');
    await repo.put(note);
    expect((await repo.get(note.id))?.body).toBe('Book the buses');
    expect(await repo.count()).toBe(1);
  });

  it('updates only the fields given', async () => {
    const repo = new DexieRepository<Note>(fakeTable<Note>());
    const note = await repo.put(makeNote('Original'));
    const updated = await repo.update(note.id, { body: 'Changed' });
    expect(updated?.body).toBe('Changed');
    expect(updated?.createdAt).toBe(note.createdAt);
  });

  it('returns undefined when updating something that is not there', async () => {
    const repo = new DexieRepository<Note>(fakeTable<Note>());
    expect(await repo.update('missing', { body: 'x' })).toBe(undefined);
  });

  it('restores the exact earlier record, which is how Undo works', async () => {
    const repo = new DexieRepository<Note>(fakeTable<Note>());
    const original = await repo.put(makeNote('Before'));
    const snapshot = { ...original };

    await repo.update(original.id, { body: 'After' });
    expect((await repo.get(original.id))?.body).toBe('After');

    await repo.put(snapshot);
    const restored = await repo.get(original.id);
    expect(restored?.body).toBe('Before');
    expect(restored?.updatedAt).toBe(original.updatedAt);
  });

  it('removes only the records that match, which is how demo data is cleared', async () => {
    const repo = new DexieRepository<Note>(fakeTable<Note>());
    await repo.bulkPut([
      createRecord<Note>({ body: 'mine' }),
      createRecord<Note>({ body: 'demo one' }, 'demo'),
      createRecord<Note>({ body: 'demo two' }, 'demo'),
    ]);

    const removed = await repo.removeWhere((record) => record.source === 'demo');
    expect(removed).toBe(2);
    const left = await repo.all();
    expect(left).toHaveLength(1);
    expect(left[0]?.body).toBe('mine');
  });
});
