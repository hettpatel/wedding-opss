'use client';

import { Check, IndianRupee, Paperclip, Store } from 'lucide-react';
import { Badge } from '@/components/ui/feedback';
import { formatInr } from '@/lib/format/currency';
import { cn } from '@/lib/utils';
import type { WeddingTask } from '@/lib/models';
import { DueBadge, PriorityBadge, StatusBadge } from './task-badges';

export function TaskCard({
  task,
  categoryName,
  attachmentCount = 0,
  onToggleComplete,
  onOpen,
}: {
  task: WeddingTask;
  categoryName: string;
  attachmentCount?: number;
  onToggleComplete: (task: WeddingTask) => void;
  onOpen: (task: WeddingTask) => void;
}) {
  const completed = task.status === 'Completed';

  return (
    <div className="app-card flex items-start gap-3 p-3">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-pressed={completed}
        aria-label={completed ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
        className={cn(
          'mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
          completed ? 'border-success bg-success text-white' : 'border-hairline bg-white text-transparent hover:border-crimson'
        )}
      >
        <Check className="h-6 w-6" aria-hidden strokeWidth={3} />
      </button>

      <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <p className={cn('text-[15px] font-medium leading-snug', completed && 'text-muted line-through')}>
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="crimson">{categoryName}</Badge>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          <DueBadge date={task.targetDate} completed={completed} />
        </div>

        {(task.vendorName || task.estimatedExpense !== null || attachmentCount > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {task.vendorName ? (
              <span className="inline-flex items-center gap-1">
                <Store className="h-3.5 w-3.5" aria-hidden />
                {task.vendorName}
              </span>
            ) : null}
            {task.estimatedExpense !== null ? (
              <span className="inline-flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" aria-hidden />
                {formatInr(task.estimatedExpense)}
              </span>
            ) : null}
            {attachmentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {attachmentCount}
              </span>
            ) : null}
          </div>
        )}

        {task.status === 'Blocked' && task.blockerReason ? (
          <p className="mt-2 rounded bg-warning/5 px-2 py-1 text-xs text-warning">
            Blocked: {task.blockerReason}
          </p>
        ) : null}
      </button>
    </div>
  );
}
