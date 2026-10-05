import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

/** Date-only values are stored as 'yyyy-MM-dd' so they never shift with time zones. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDisplayDate(value: string | null | undefined): string {
  const parsed = parseIsoDate(value ?? null);
  if (!parsed) return '—';
  return format(parsed, 'd MMM yyyy');
}

export function formatDisplayDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—';
  const parsed = parseISO(isoDateTime);
  if (!isValid(parsed)) return '—';
  return format(parsed, "d MMM yyyy 'at' h:mm a");
}

export function daysUntil(value: string | null | undefined, now: Date = new Date()): number | null {
  const parsed = parseIsoDate(value ?? null);
  if (!parsed) return null;
  return differenceInCalendarDays(parsed, startOfDay(now));
}

/** "Today", "Tomorrow", "3 days left", "2 days late" — wording a person can act on. */
export function formatDueLabel(value: string | null | undefined, now: Date = new Date()): string {
  const diff = daysUntil(value, now);
  if (diff === null) return 'No date';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return '1 day late';
  if (diff < -1) return `${Math.abs(diff)} days late`;
  if (diff <= 7) return `${diff} days left`;
  return formatDisplayDate(value);
}

export function isOverdueDate(value: string | null | undefined, now: Date = new Date()): boolean {
  const diff = daysUntil(value, now);
  return diff !== null && diff < 0;
}
