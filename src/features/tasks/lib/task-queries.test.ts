import { describe, expect, it } from 'vitest';
import type { WeddingTask } from '@/lib/models';
import {
  applyTaskFilters,
  applyTaskView,
  DEFAULT_TASK_FILTERS,
  sortTasks,
  summariseTasks,
} from './task-queries';

const now = new Date(2026, 5, 10); // 10 June 2026

function task(partial: Partial<WeddingTask> & { id: string }): WeddingTask {
  return {
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    schemaVersion: 1,
    source: 'user',
    title: 'Task',
    originalInput: '',
    categoryId: 'cat-1',
    priority: 'Medium',
    status: 'Open',
    targetDate: null,
    reminderDate: null,
    assignedTo: null,
    details: null,
    blockerReason: null,
    vendorId: null,
    vendorName: null,
    vendorPhone: null,
    estimatedExpense: null,
    actualExpense: null,
    quantityValue: null,
    quantityUnit: null,
    completionNotes: null,
    completedAt: null,
    ...partial,
  } as WeddingTask;
}

const tasks: WeddingTask[] = [
  task({ id: 'today', title: 'Pay the decorator', targetDate: '2026-06-10' }),
  task({ id: 'late', title: 'Book buses', targetDate: '2026-06-05', priority: 'High' }),
  task({ id: 'soon', title: 'Confirm menu', targetDate: '2026-06-20' }),
  task({ id: 'blocked', title: 'Order boxes', status: 'Blocked', blockerReason: 'Waiting for size' }),
  task({ id: 'done', title: 'Print cards', status: 'Completed', targetDate: '2026-06-02' }),
  task({ id: 'nodate', title: 'Buy torch', categoryId: 'cat-2' }),
];

describe('task views', () => {
  it('splits tasks into the dashboard views', () => {
    expect(applyTaskView(tasks, 'today', now).map((t) => t.id)).toEqual(['today']);
    expect(applyTaskView(tasks, 'overdue', now).map((t) => t.id)).toEqual(['late']);
    expect(applyTaskView(tasks, 'upcoming', now).map((t) => t.id)).toEqual(['soon']);
    expect(applyTaskView(tasks, 'high', now).map((t) => t.id)).toEqual(['late']);
    expect(applyTaskView(tasks, 'blocked', now).map((t) => t.id)).toEqual(['blocked']);
    expect(applyTaskView(tasks, 'completed', now).map((t) => t.id)).toEqual(['done']);
    expect(applyTaskView(tasks, 'all', now)).toHaveLength(6);
  });

  it('never counts a completed task as overdue', () => {
    expect(applyTaskView(tasks, 'overdue', now).some((t) => t.id === 'done')).toBe(false);
  });

  it('summarises the dashboard numbers', () => {
    const summary = summariseTasks(tasks, now);
    expect(summary.dueToday).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.completed).toBe(1);
    expect(summary.open).toBe(5);
    expect(summary.total).toBe(6);
  });
});

describe('task filters and sorting', () => {
  it('searches title, vendor and the original sentence', () => {
    const withVendor = task({ id: 'v', title: 'Stage work', vendorName: 'Mahesh decorator' });
    const result = applyTaskFilters([...tasks, withVendor], {
      ...DEFAULT_TASK_FILTERS,
      search: 'mahesh',
    }, now);
    expect(result.map((t) => t.id)).toEqual(['v']);
  });

  it('filters by category, priority and date range', () => {
    expect(
      applyTaskFilters(tasks, { ...DEFAULT_TASK_FILTERS, categoryId: 'cat-2' }, now).map((t) => t.id)
    ).toEqual(['nodate']);
    expect(
      applyTaskFilters(tasks, { ...DEFAULT_TASK_FILTERS, priority: 'High' }, now).map((t) => t.id)
    ).toEqual(['late']);
    expect(
      applyTaskFilters(
        tasks,
        { ...DEFAULT_TASK_FILTERS, from: '2026-06-09', to: '2026-06-21' },
        now
      ).map((t) => t.id)
    ).toEqual(['today', 'soon']);
  });

  it('puts undated tasks last when sorting by date', () => {
    const sorted = sortTasks(tasks, 'date-asc');
    expect(sorted[sorted.length - 1]?.id).toBe('nodate');
    expect(sorted[0]?.id).toBe('done');
  });

  it('sorts by priority before date', () => {
    const sorted = sortTasks(tasks, 'priority');
    expect(sorted[0]?.id).toBe('late');
  });
});
