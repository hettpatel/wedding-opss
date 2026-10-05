'use client';

import { Check } from 'lucide-react';
import { formatInr } from '@/lib/format/currency';
import { formatDueLabel } from '@/lib/format/date';
import { cn } from '@/lib/utils';
import type { WeddingTask } from '@/lib/models';
import { TaskCard } from './task-card';
import { DueBadge, PriorityBadge, StatusBadge } from './task-badges';

export function TaskList({
  tasks,
  categoryNames,
  attachmentCounts,
  onToggleComplete,
  onOpen,
}: {
  tasks: WeddingTask[];
  categoryNames: Record<string, string>;
  attachmentCounts: Record<string, number>;
  onToggleComplete: (task: WeddingTask) => void;
  onOpen: (task: WeddingTask) => void;
}) {
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskCard
              task={task}
              categoryName={categoryNames[task.categoryId] ?? 'Uncategorised'}
              attachmentCount={attachmentCounts[task.id] ?? 0}
              onToggleComplete={onToggleComplete}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <caption className="sr-only">Wedding tasks</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="w-12 px-2 pb-1">
                Done
              </th>
              <th scope="col" className="px-2 pb-1">Task</th>
              <th scope="col" className="px-2 pb-1">Category</th>
              <th scope="col" className="px-2 pb-1">Due</th>
              <th scope="col" className="px-2 pb-1">Status</th>
              <th scope="col" className="px-2 pb-1 text-right">Budget</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const completed = task.status === 'Completed';
              return (
                <tr key={task.id} className="bg-white align-middle shadow-card">
                  <td className="rounded-l-card px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task)}
                      aria-pressed={completed}
                      aria-label={completed ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-md border-2',
                        completed
                          ? 'border-success bg-success text-white'
                          : 'border-hairline text-transparent hover:border-crimson'
                      )}
                    >
                      <Check className="h-5 w-5" aria-hidden strokeWidth={3} />
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className={cn('text-left font-medium', completed && 'text-muted line-through')}
                      onClick={() => onOpen(task)}
                    >
                      {task.title}
                    </button>
                    {task.vendorName ? (
                      <span className="block text-xs text-muted">{task.vendorName}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-muted">{categoryNames[task.categoryId] ?? '—'}</td>
                  <td className="px-2 py-2">
                    {task.targetDate ? (
                      <DueBadge date={task.targetDate} completed={completed} />
                    ) : (
                      <span className="text-muted">{formatDueLabel(null)}</span>
                    )}
                  </td>
                  <td className="space-x-1 px-2 py-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="rounded-r-card px-2 py-2 text-right tabular-nums text-muted">
                    {task.estimatedExpense === null ? '—' : formatInr(task.estimatedExpense)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
