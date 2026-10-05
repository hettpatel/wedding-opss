import { Badge } from '@/components/ui/feedback';
import { formatDueLabel, isOverdueDate } from '@/lib/format/date';
import type { TaskPriority, TaskStatus } from '@/lib/models';

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'Medium') return null;
  return (
    <Badge tone={priority === 'High' ? 'error' : 'neutral'}>
      {priority === 'High' ? 'High priority' : 'Low priority'}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'Open') return null;
  const tone = status === 'Completed' ? 'success' : status === 'Blocked' ? 'warning' : 'crimson';
  return <Badge tone={tone}>{status}</Badge>;
}

export function DueBadge({ date, completed }: { date: string | null; completed: boolean }) {
  if (!date) return null;
  const late = !completed && isOverdueDate(date);
  return <Badge tone={late ? 'error' : 'neutral'}>{formatDueLabel(date)}</Badge>;
}
