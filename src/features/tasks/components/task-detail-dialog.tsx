'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { formatInr } from '@/lib/format/currency';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/format/date';
import { buildWhatsAppLink, formatPhoneForDisplay, normalizePhone } from '@/lib/format/phone';
import type { TaskAttachment, TaskComment, WeddingTask } from '@/lib/models';
import { completeTask, deleteTaskWithChildren, reopenTask, restoreTask } from '../lib/task-service';
import { DueBadge, PriorityBadge, StatusBadge } from './task-badges';
import { TaskAttachments } from './task-attachments';
import { TaskNotes } from './task-notes';

export function TaskDetailDialog({
  task,
  categoryName,
  attachments,
  comments,
  onClose,
  onEdit,
}: {
  task: WeddingTask | null;
  categoryName: string;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  onClose: () => void;
  onEdit: (task: WeddingTask) => void;
}) {
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking] = useState(false);

  if (!task) return null;

  const completed = task.status === 'Completed';
  const phone = task.vendorPhone ? normalizePhone(task.vendorPhone) : null;

  const rows: Array<[string, string | null]> = [
    ['Category', categoryName],
    ['Target date', task.targetDate ? formatDisplayDate(task.targetDate) : 'No date set'],
    ['Reminder', task.reminderDate ? formatDisplayDate(task.reminderDate) : null],
    ['Assigned to', task.assignedTo],
    ['Vendor', task.vendorName],
    ['Estimated', task.estimatedExpense === null ? null : formatInr(task.estimatedExpense)],
    ['Actual', task.actualExpense === null ? null : formatInr(task.actualExpense)],
    [
      'Quantity',
      task.quantityValue === null ? null : `${task.quantityValue} ${task.quantityUnit ?? ''}`.trim(),
    ],
    ['Blocked because', task.blockerReason],
    ['Completion notes', task.completionNotes],
    ['Added', formatDisplayDateTime(task.createdAt)],
    ['Completed', task.completedAt ? formatDisplayDateTime(task.completedAt) : null],
  ];

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={task.title}
        footer={
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="quiet" size="block" onClick={() => onEdit(task)}>
                Edit
              </Button>
              <Button
                size="block"
                pending={working}
                onClick={async () => {
                  setWorking(true);
                  const previous = task;
                  if (completed) await reopenTask(task);
                  else await completeTask(task);
                  setWorking(false);
                  showToast({
                    message: completed ? 'Task reopened' : 'Task marked as done',
                    tone: 'success',
                    action: {
                      label: 'Undo',
                      onClick: () => void restoreTask(previous),
                    },
                  });
                  onClose();
                }}
              >
                {completed ? 'Reopen task' : 'Mark as done'}
              </Button>
            </div>
            <Button variant="ghost" size="block" onClick={() => setConfirmDelete(true)}>
              Delete task
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="crimson">{categoryName}</Badge>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            <DueBadge date={task.targetDate} completed={completed} />
          </div>

          {task.details ? <p className="text-sm leading-relaxed">{task.details}</p> : null}

          {phone?.normalized ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:+${phone.normalized}`}
                className="flex min-h-touch items-center rounded-lg border border-hairline px-3 text-sm font-medium"
              >
                Call {formatPhoneForDisplay(phone)}
              </a>
              <a
                href={buildWhatsAppLink(phone.normalized, '')}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-touch items-center rounded-lg border border-hairline px-3 text-sm font-medium"
              >
                Open WhatsApp
              </a>
            </div>
          ) : null}

          <dl className="divide-y divide-hairline text-sm">
            {rows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2">
                  <dt className="w-32 shrink-0 text-muted">{label}</dt>
                  <dd className="min-w-0">{value}</dd>
                </div>
              ))}
          </dl>

          <TaskNotes taskId={task.id} comments={comments} />

          <TaskAttachments taskId={task.id} attachments={attachments} />

          {task.originalInput && task.originalInput !== task.title ? (
            <div className="rounded-lg border border-hairline bg-surface px-3 py-2">
              <p className="text-xs font-medium text-muted">Your original words</p>
              <p className="mt-1 text-sm">{task.originalInput}</p>
            </div>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description="The task, its notes and its photos will be removed from this phone. This cannot be undone."
        confirmLabel="Delete task"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteTaskWithChildren(task.id);
          setConfirmDelete(false);
          showToast({ message: 'Task deleted' });
          onClose();
        }}
      />
    </>
  );
}
