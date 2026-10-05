'use client';

import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useAppSettings } from '@/hooks/use-app-data';
import {
  previewBackupFile,
  restoreBackup,
  exportBackupToFile,
  type BackupPreview,
  type RestoreMode,
} from '@/lib/backup/backup-service';
import { acceptAttribute, validateFile } from '@/lib/files/validate';
import { formatDisplayDateTime } from '@/lib/format/date';
import { formatBytes } from '@/lib/storage/quota';

export default function BackupPage() {
  const settings = useAppSettings();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Save a backup"
          description="One file with every task, guest, template and setting on this phone."
        />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted">
            Last backup:{' '}
            {settings?.lastBackupAt ? formatDisplayDateTime(settings.lastBackupAt) : 'never'}
          </p>
          <Button
            size="block"
            pending={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const result = await exportBackupToFile();
                showToast({
                  message: `Backup saved: ${result.fileName} (${formatBytes(result.sizeBytes)})`,
                  tone: 'success',
                });
              } catch {
                showToast({ message: 'The backup could not be created. Try again.', tone: 'error' });
              }
              setExporting(false);
            }}
          >
            <Download className="h-4 w-4" aria-hidden />
            Export backup file
          </Button>
          <p className="text-xs text-muted">
            Keep the file somewhere safe: email it to yourself, or copy it to a computer. Photos and
            receipts are included, so the file can be large.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Restore from a backup"
          description="Nothing is changed until you confirm."
        />
        <div className="space-y-3 p-4">
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttribute('backup')}
            className="sr-only"
        aria-label="Choose a backup file"
        tabIndex={-1}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;

              const validation = validateFile(file, 'backup');
              if (!validation.ok) {
                setPreview({ ok: false, error: validation.error, backup: null, summary: [] });
                return;
              }
              setPreview(await previewBackupFile(file));
            }}
          />

          <Button variant="quiet" size="block" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden />
            Choose a backup file
          </Button>

          {preview?.error ? <InlineNotice tone="error">{preview.error}</InlineNotice> : null}

          {preview?.ok && preview.backup ? (
            <div className="space-y-3 rounded-lg border border-gold/60 bg-gold/5 p-3">
              <p className="text-sm font-semibold">
                Backup from {formatDisplayDateTime(preview.backup.exportedAt)}
              </p>
              <ul className="space-y-1 text-sm">
                {preview.summary.map((row) => (
                  <li key={row.table} className="flex justify-between gap-3">
                    <span className="text-muted">{row.label}</span>
                    <span className="tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">How should this be restored?</legend>
                <label className="flex min-h-touch items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="restore-mode"
                    className="mt-1 h-5 w-5"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                  />
                  <span>
                    <span className="block font-medium">Add what is missing</span>
                    <span className="block text-muted">
                      Existing records are left exactly as they are. Nothing is overwritten.
                    </span>
                  </span>
                </label>
                <label className="flex min-h-touch items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="restore-mode"
                    className="mt-1 h-5 w-5"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  <span>
                    <span className="block font-medium">Replace everything</span>
                    <span className="block text-muted">
                      Current data is removed first. A safety backup of it is downloaded
                      automatically before anything is deleted.
                    </span>
                  </span>
                </label>
              </fieldset>

              <Button size="block" onClick={() => setConfirmRestore(true)}>
                Restore this backup
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmRestore}
        title={mode === 'replace' ? 'Replace everything on this phone?' : 'Add the missing records?'}
        description={
          mode === 'replace'
            ? 'Your current tasks, guests and settings will be deleted and replaced. A safety copy is downloaded first so nothing is lost for good. Every record in the file is checked before it is written.'
            : 'Records that already exist will be left untouched. Only records that are missing will be added, and each one is checked first.'
        }
        confirmLabel={mode === 'replace' ? 'Replace everything' : 'Add missing records'}
        destructive={mode === 'replace'}
        pending={restoring}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={async () => {
          if (!preview?.backup) return;
          setRestoring(true);
          try {
            const result = await restoreBackup(preview.backup, mode);
            const base =
              mode === 'replace'
                ? `Restored ${result.added} records`
                : `Added ${result.added} records, kept ${result.skipped} existing ones`;
            showToast({
              message:
                result.skippedInvalid > 0
                  ? `${base}. ${result.skippedInvalid} did not match this app and were left out.`
                  : base,
              tone: result.skippedInvalid > 0 ? 'neutral' : 'success',
            });
            setPreview(null);
          } catch {
            showToast({ message: 'The restore did not finish. Your data was not changed.', tone: 'error' });
          }
          setRestoring(false);
          setConfirmRestore(false);
        }}
      />
    </div>
  );
}
