'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { InlineNotice } from '@/components/ui/feedback';
import { getDb, BACKUP_TABLE_NAMES } from '@/lib/db/db';
import { formatBytes, readStorageEstimate, requestPersistentStorage, type StorageEstimateInfo } from '@/lib/storage/quota';

const LABELS: Record<string, string> = {
  tasks: 'Tasks',
  taskCategories: 'Categories',
  taskComments: 'Task notes',
  taskAttachments: 'Photos and receipts',
  vendors: 'Vendors',
  expenses: 'Expenses',
  guests: 'Guest households',
  invitationTemplates: 'Invitation templates',
  messageTemplates: 'Message templates',
  dispatchAttempts: 'Sending history',
  errorLogs: 'Error log',
};

export default function StoragePage() {
  const [estimate, setEstimate] = useState<StorageEstimateInfo | null>(null);
  const [persisting, setPersisting] = useState(false);

  const counts = useLiveQuery(async () => {
    const db = getDb();
    const entries: Array<[string, number]> = [];
    for (const name of BACKUP_TABLE_NAMES) {
      if (!LABELS[name]) continue;
      entries.push([name, await db.table(name).count()]);
    }
    return entries;
  }, []);

  const attachmentCount = useLiveQuery(() => getDb().taskAttachments.count(), []);

  useEffect(() => {
    void readStorageEstimate().then(setEstimate);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Space used on this phone" />
        <div className="space-y-3 p-4">
          {estimate?.supported ? (
            <>
              <p className="text-sm">
                {formatBytes(estimate.usedBytes)} used of about {formatBytes(estimate.quotaBytes)}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface" role="presentation">
                <div
                  className={
                    estimate.level === 'critical'
                      ? 'h-full bg-error'
                      : estimate.level === 'watch'
                        ? 'h-full bg-warning'
                        : 'h-full bg-success'
                  }
                  style={{ width: `${Math.min(100, Math.max(2, estimate.usedPercent))}%` }}
                />
              </div>
              {estimate.level !== 'ok' ? (
                <InlineNotice tone={estimate.level === 'critical' ? 'error' : 'warning'}>
                  Storage is nearly full. Export a backup, then delete photos you no longer need.
                </InlineNotice>
              ) : null}
              {!estimate.persisted ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    The browser may clear this data if the phone runs out of space.
                  </p>
                  <Button
                    variant="quiet"
                    size="block"
                    pending={persisting}
                    onClick={async () => {
                      setPersisting(true);
                      const granted = await requestPersistentStorage();
                      setEstimate((current) => (current ? { ...current, persisted: granted } : current));
                      setPersisting(false);
                    }}
                  >
                    Ask the browser to keep this data
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-success">This data is marked as protected storage.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              This browser does not report storage usage. The record counts below still work.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="What is stored" />
        <ul className="divide-y divide-hairline px-4 pb-2">
          {(counts ?? []).map(([name, count]) => (
            <li key={name} className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="text-muted">{LABELS[name]}</span>
              <span className="tabular-nums">{count}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 py-2.5 text-sm">
            <span className="text-muted">Files attached to tasks</span>
            <span className="tabular-nums">{attachmentCount ?? 0}</span>
          </li>
        </ul>
      </Card>

      <p className="text-xs text-muted">
        Personalised invitation PDFs are created when you need them and are not kept on the phone,
        so 500 guests do not use 500 files of space.
      </p>
    </div>
  );
}
