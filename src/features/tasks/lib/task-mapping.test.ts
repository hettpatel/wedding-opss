import { describe, expect, it } from 'vitest';
import type { WeddingTask } from '@/lib/models';
import {
  EMPTY_TASK_FORM,
  formValuesToTask,
  taskToFormValues,
  type TaskFormValues,
} from './task-mapping';

const values = (overrides: Partial<TaskFormValues> = {}): TaskFormValues => ({
  ...EMPTY_TASK_FORM,
  title: '  Book the buses  ',
  categoryId: 'cat-transport',
  ...overrides,
});

describe('formValuesToTask', () => {
  it('trims text and turns empty fields into null rather than empty strings', () => {
    const task = formValuesToTask(values(), {});
    expect(task.title).toBe('Book the buses');
    expect(task.targetDate).toBeNull();
    expect(task.vendorName).toBeNull();
    expect(task.estimatedExpense).toBeNull();
    expect(task.quantityValue).toBeNull();
  });

  it('reads money the way a person types it', () => {
    expect(formValuesToTask(values({ estimatedExpense: '75k' }), {}).estimatedExpense).toBe(75000);
    expect(formValuesToTask(values({ estimatedExpense: '₹75,000' }), {}).estimatedExpense).toBe(75000);
    expect(formValuesToTask(values({ actualExpense: '1.5 lakh' }), {}).actualExpense).toBe(150000);
  });

  it('keeps the original sentence separate from the title', () => {
    const task = formValuesToTask(values(), { originalInput: 'arrange 3 buses for baraat' });
    expect(task.originalInput).toBe('arrange 3 buses for baraat');
    expect(task.title).toBe('Book the buses');
  });

  it('falls back to the title when there was no dictated sentence', () => {
    expect(formValuesToTask(values(), {}).originalInput).toBe('Book the buses');
  });

  it('records a completion time only when the task is completed', () => {
    expect(formValuesToTask(values(), {}).completedAt).toBeNull();
    expect(formValuesToTask(values({ status: 'Completed' }), {}).completedAt).toBeTruthy();
  });
});

describe('editing an existing task', () => {
  const existing: WeddingTask = formValuesToTask(values({ status: 'Completed' }), {});

  it('keeps id and creation time, and clears completion when reopened', () => {
    const reopened = formValuesToTask(taskToFormValues({ ...existing, status: 'Open' }), {
      existing,
    });
    expect(reopened.id).toBe(existing.id);
    expect(reopened.createdAt).toBe(existing.createdAt);
    expect(reopened.completedAt).toBeNull();
  });

  it('does not move the completion time when an finished task is edited', () => {
    const edited = formValuesToTask(taskToFormValues(existing), { existing });
    expect(edited.completedAt).toBe(existing.completedAt);
  });

  it('round-trips through the form without losing anything', () => {
    const task = formValuesToTask(
      values({
        targetDate: '2026-06-14',
        reminderDate: '2026-06-12',
        vendorName: 'Mahesh Decorators',
        vendorPhone: '9876543210',
        estimatedExpense: '185000',
        quantityValue: '3',
        quantityUnit: 'buses',
        assignedTo: 'Papa',
        details: 'Three 32-seat buses',
        status: 'Blocked',
        blockerReason: 'Waiting for the final count',
      }),
      {}
    );
    const back = formValuesToTask(taskToFormValues(task), { existing: task });

    expect(back.targetDate).toBe('2026-06-14');
    expect(back.reminderDate).toBe('2026-06-12');
    expect(back.vendorName).toBe('Mahesh Decorators');
    expect(back.estimatedExpense).toBe(185000);
    expect(back.quantityValue).toBe(3);
    expect(back.quantityUnit).toBe('buses');
    expect(back.blockerReason).toBe('Waiting for the final count');
  });
});
