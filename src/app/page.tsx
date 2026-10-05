'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { InlineNotice } from '@/components/ui/feedback';
import { InstallPrompt } from '@/components/shell/install-prompt';
import { StatTile } from '@/features/dashboard/stat-tile';
import { useAppSettings } from '@/hooks/use-app-data';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import { summariseTasks } from '@/features/tasks/lib/task-queries';
import { isBackupOverdue } from '@/lib/backup/backup-service';
import { getDb } from '@/lib/db/db';
import { formatInr } from '@/lib/format/currency';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/format/date';
import { CONFIRMED_SENT_STATUS } from '@/lib/models';

export default function HomePage() {
  const tasks = useTasks();
  const settings = useAppSettings();
  const guests = useLiveQuery(() => getDb().guests.toArray(), []);
  const expenses = useLiveQuery(() => getDb().expenses.toArray(), []);

  const summary = useMemo(() => summariseTasks(tasks ?? []), [tasks]);

  const invitations = useMemo(() => {
    const list = guests ?? [];
    return {
      total: list.length,
      pending: list.filter((guest) => guest.invitationStatus === 'Pending').length,
      generated: list.filter((guest) => guest.invitationStatus === 'Invitation Generated').length,
      awaiting: list.filter((guest) =>
        ['Share Sheet Opened', 'WhatsApp Opened'].includes(guest.invitationStatus)
      ).length,
      confirmed: list.filter((guest) => guest.invitationStatus === CONFIRMED_SENT_STATUS).length,
    };
  }, [guests]);

  const money = useMemo(() => {
    const list = expenses ?? [];
    const paid = list
      .filter((expense) => expense.paymentStatus !== 'Unpaid')
      .reduce((total, expense) => total + expense.amount, 0);
    const outstanding = list
      .filter((expense) => expense.paymentStatus === 'Unpaid')
      .reduce((total, expense) => total + expense.amount, 0);
    const recent = [...list]
      .sort((a, b) => (b.paymentDate ?? b.createdAt).localeCompare(a.paymentDate ?? a.createdAt))
      .slice(0, 3);
    return { paid, outstanding, recent };
  }, [expenses]);

  const backupOverdue = settings
    ? isBackupOverdue(settings.lastBackupAt, settings.backupReminderDays)
    : false;

  return (
    <div className="space-y-5">
      <InstallPrompt />

      {backupOverdue ? (
        <InlineNotice tone="warning">
          <span className="block">
            {settings?.lastBackupAt
              ? `Last backup was ${formatDisplayDateTime(settings.lastBackupAt)}.`
              : 'You have not saved a backup yet.'}{' '}
            <Link href="/more/backup" className="font-semibold underline">
              Export one now
            </Link>
          </span>
        </InlineNotice>
      ) : null}

      <section aria-labelledby="tasks-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="tasks-heading" className="text-base font-semibold">
            Tasks
          </h2>
          <Link href="/tasks" className="text-sm font-medium text-crimson">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Due today" value={summary.dueToday} href="/tasks/?view=today" tone="crimson" />
          <StatTile label="Overdue" value={summary.overdue} href="/tasks/?view=overdue" tone={summary.overdue > 0 ? 'error' : 'neutral'} />
          <StatTile label="High priority" value={summary.highPriorityOpen} href="/tasks/?view=high" />
          <StatTile label="Blocked" value={summary.blocked} href="/tasks/?view=blocked" tone={summary.blocked > 0 ? 'warning' : 'neutral'} />
        </div>
      </section>

      <section aria-labelledby="invitations-heading" className="space-y-2">
        <h2 id="invitations-heading" className="text-base font-semibold">
          Invitations
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Guest households" value={invitations.total} href="/guests" />
          <StatTile label="Invitations pending" value={invitations.pending} href="/guests" />
          <StatTile label="Invitations generated" value={invitations.generated} href="/invitations" />
          <StatTile
            label="Waiting for your confirmation"
            value={invitations.awaiting}
            href="/invitations"
            tone={invitations.awaiting > 0 ? 'warning' : 'neutral'}
          />
        </div>
        <p className="text-xs text-muted">
          Nothing is counted as sent until you confirm it yourself.
        </p>
      </section>

      {money.recent.length > 0 ? (
        <section aria-labelledby="money-heading" className="space-y-2">
          <h2 id="money-heading" className="text-base font-semibold">
            Money
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Paid so far" value={formatInr(money.paid)} />
            <StatTile label="Still to pay" value={formatInr(money.outstanding)} tone={money.outstanding > 0 ? 'warning' : 'neutral'} />
          </div>
          <Card>
            <CardHeader title="Recent expenses" />
            <ul className="divide-y divide-hairline px-4 pb-2">
              {money.recent.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{expense.description}</span>
                    <span className="text-xs text-muted">
                      {expense.paymentDate ? formatDisplayDate(expense.paymentDate) : expense.paymentStatus}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatInr(expense.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="space-y-2">
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Last backup</p>
            <p className="text-sm text-muted">
              {settings?.lastBackupAt ? formatDisplayDateTime(settings.lastBackupAt) : 'Never'}
            </p>
          </div>
          <Link href="/more/backup" className="shrink-0 text-sm font-medium text-crimson">
            Backup
          </Link>
        </Card>
      </section>

      <div className="sticky bottom-2 z-20">
        <Link
          href="/tasks"
          className="flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 text-[15px] font-semibold text-white shadow-raised"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Add task
        </Link>
      </div>

      {tasks && tasks.length === 0 ? (
        <Card className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-crimson">
            <CalendarClock className="h-5 w-5" aria-hidden />
            <p className="font-medium">Nothing is set up yet</p>
          </div>
          <p className="text-sm text-muted">
            Start by adding a task in your own words, or load the demo data from Settings to see how
            everything works.
          </p>
          <Link href="/more/settings" className="text-sm font-medium text-crimson">
            Open settings
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
