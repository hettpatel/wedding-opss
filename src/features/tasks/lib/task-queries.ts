import { todayIso } from '@/lib/format/date';
import type { TaskPriority, TaskStatus, WeddingTask } from '@/lib/models';

export type TaskView = 'today' | 'upcoming' | 'overdue' | 'high' | 'blocked' | 'completed' | 'all';

export const TASK_VIEWS: Array<{ id: TaskView; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'high', label: 'High priority' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All tasks' },
];

export type TaskSort = 'date-asc' | 'date-desc' | 'priority' | 'created-desc' | 'title';

export const TASK_SORTS: Array<{ id: TaskSort; label: string }> = [
  { id: 'date-asc', label: 'Date, soonest first' },
  { id: 'date-desc', label: 'Date, latest first' },
  { id: 'priority', label: 'Priority' },
  { id: 'created-desc', label: 'Recently added' },
  { id: 'title', label: 'Title A-Z' },
];

export interface TaskFilters {
  view: TaskView;
  search: string;
  categoryId: string | 'all';
  priority: TaskPriority | 'all';
  status: TaskStatus | 'all';
  from: string | null;
  to: string | null;
  sort: TaskSort;
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  view: 'all',
  search: '',
  categoryId: 'all',
  priority: 'all',
  status: 'all',
  from: null,
  to: null,
  sort: 'date-asc',
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

export function isOpen(task: WeddingTask): boolean {
  return task.status !== 'Completed';
}

export function applyTaskView(tasks: WeddingTask[], view: TaskView, now: Date = new Date()): WeddingTask[] {
  const today = todayIso(now);

  switch (view) {
    case 'today':
      return tasks.filter((task) => isOpen(task) && task.targetDate === today);
    case 'upcoming':
      return tasks.filter((task) => isOpen(task) && !!task.targetDate && task.targetDate > today);
    case 'overdue':
      return tasks.filter((task) => isOpen(task) && !!task.targetDate && task.targetDate < today);
    case 'high':
      return tasks.filter((task) => isOpen(task) && task.priority === 'High');
    case 'blocked':
      return tasks.filter((task) => task.status === 'Blocked');
    case 'completed':
      return tasks.filter((task) => task.status === 'Completed');
    case 'all':
    default:
      return tasks;
  }
}

export function applyTaskFilters(
  tasks: WeddingTask[],
  filters: TaskFilters,
  now: Date = new Date()
): WeddingTask[] {
  const term = filters.search.trim().toLowerCase();

  const filtered = applyTaskView(tasks, filters.view, now).filter((task) => {
    if (filters.categoryId !== 'all' && task.categoryId !== filters.categoryId) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.from && (!task.targetDate || task.targetDate < filters.from)) return false;
    if (filters.to && (!task.targetDate || task.targetDate > filters.to)) return false;

    if (term) {
      const haystack = [
        task.title,
        task.details ?? '',
        task.vendorName ?? '',
        task.assignedTo ?? '',
        task.originalInput,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return sortTasks(filtered, filters.sort);
}

export function sortTasks(tasks: WeddingTask[], sort: TaskSort): WeddingTask[] {
  const copy = [...tasks];

  switch (sort) {
    case 'date-asc':
      // Tasks without a date go last rather than pretending to be due today.
      return copy.sort((a, b) => compareDates(a.targetDate, b.targetDate, 1));
    case 'date-desc':
      return copy.sort((a, b) => compareDates(a.targetDate, b.targetDate, -1));
    case 'priority':
      return copy.sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          compareDates(a.targetDate, b.targetDate, 1)
      );
    case 'created-desc':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return copy;
  }
}

function compareDates(a: string | null, b: string | null, direction: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) * direction;
}

export interface TaskSummary {
  dueToday: number;
  overdue: number;
  highPriorityOpen: number;
  blocked: number;
  open: number;
  completed: number;
  total: number;
}

export function summariseTasks(tasks: WeddingTask[], now: Date = new Date()): TaskSummary {
  return {
    dueToday: applyTaskView(tasks, 'today', now).length,
    overdue: applyTaskView(tasks, 'overdue', now).length,
    highPriorityOpen: applyTaskView(tasks, 'high', now).length,
    blocked: applyTaskView(tasks, 'blocked', now).length,
    open: tasks.filter(isOpen).length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    total: tasks.length,
  };
}

export function countActiveFilters(filters: TaskFilters): number {
  let count = 0;
  if (filters.categoryId !== 'all') count += 1;
  if (filters.priority !== 'all') count += 1;
  if (filters.status !== 'all') count += 1;
  if (filters.from || filters.to) count += 1;
  if (filters.search.trim()) count += 1;
  return count;
}
