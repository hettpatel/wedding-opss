'use client';

import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Chip, InlineNotice } from '@/components/ui/feedback';
import { Field, Select } from '@/components/ui/form-controls';
import { useToast } from '@/components/ui/toast';
import { logAppError } from '@/lib/db/repositories';
import { downloadBlob } from '@/lib/files/download';
import { acceptAttribute, validateFile } from '@/lib/files/validate';
import type { GuestHousehold } from '@/lib/models';
import {
  GUEST_IMPORT_FIELDS,
  detectHeaderRow,
  mappingIssues,
  suggestMapping,
  type ColumnMapping,
  type GuestImportField,
} from '../lib/column-mapping';
import {
  buildImportPlan,
  findImportDuplicates,
  RESOLUTION_HELP,
  RESOLUTION_LABELS,
  type DuplicateResolution,
} from '../lib/duplicate-review';
import { fieldLabel, prepareRows, summarisePrepared, type PreparedRow } from '../lib/guest-import';
import { buildIssueCsv, issueCsvFileName } from '../lib/rejected-rows';
import { commitImport } from '../lib/guest-service';
import { readWorkbook, type SheetData } from '../lib/workbook';

type Step = 'file' | 'sheet' | 'map' | 'check' | 'duplicates' | 'done';

interface Result {
  created: number;
  replaced: number;
  flagged: number;
  skipped: number;
  rejected: number;
}

export function ImportWizard({
  open,
  onClose,
  existingGuests,
  defaultCountryCode,
}: {
  open: boolean;
  onClose: () => void;
  existingGuests: GuestHousehold[];
  defaultCountryCode: string;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('file');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [resolutions, setResolutions] = useState<Record<number, DuplicateResolution>>({});
  const [result, setResult] = useState<Result | null>(null);

  const sheet = sheets[sheetIndex];
  const headers = useMemo(() => sheet?.rows[headerRowIndex] ?? [], [sheet, headerRowIndex]);

  const prepared = useMemo<PreparedRow[]>(() => {
    if (!sheet || !mapping || mapping.primaryGuestName === null) return [];
    return prepareRows(sheet.rows, { mapping, headerRowIndex, headers, defaultCountryCode });
  }, [defaultCountryCode, headerRowIndex, headers, mapping, sheet]);

  const summary = useMemo(() => summarisePrepared(prepared), [prepared]);

  const duplicateInputs = useMemo(
    () =>
      existingGuests.map((guest) => ({
        id: guest.id,
        label: guest.primaryGuestName,
        primaryGuestName: guest.primaryGuestName,
        invitationDisplayName: guest.invitationDisplayName,
        normalizedPhone: guest.normalizedPhone,
        village: guest.village,
      })),
    [existingGuests]
  );

  const findings = useMemo(
    () => findImportDuplicates(prepared, duplicateInputs),
    [duplicateInputs, prepared]
  );

  const plan = useMemo(
    () => buildImportPlan(prepared, findings, resolutions),
    [findings, prepared, resolutions]
  );

  const reset = () => {
    setStep('file');
    setError(null);
    setFileName('');
    setSheets([]);
    setSheetIndex(0);
    setHeaderRowIndex(0);
    setMapping(null);
    setResolutions({});
    setResult(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const loadFile = async (file: File) => {
    const validation = validateFile(file, 'spreadsheet');
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const loaded = await readWorkbook(file);
      const usable = loaded.filter((item) => item.rows.length > 0);
      if (usable.length === 0) {
        setError('That file has no rows in it. Check the file and try again.');
        setBusy(false);
        return;
      }

      const first = usable[0];
      const detected = first ? detectHeaderRow(first.rows) : 0;
      setFileName(file.name);
      setSheets(usable);
      setSheetIndex(0);
      setHeaderRowIndex(detected);
      setMapping(suggestMapping(first?.rows[detected] ?? []));
      setStep(usable.length > 1 ? 'sheet' : 'map');
    } catch (caught) {
      await logAppError('import', 'The spreadsheet could not be read', caught);
      setError('That file could not be read. Save it again as .xlsx or .csv and try once more.');
    }
    setBusy(false);
  };

  const chooseSheet = (index: number) => {
    const chosen = sheets[index];
    const detected = chosen ? detectHeaderRow(chosen.rows) : 0;
    setSheetIndex(index);
    setHeaderRowIndex(detected);
    setMapping(suggestMapping(chosen?.rows[detected] ?? []));
    setResolutions({});
  };

  const downloadIssues = () => {
    const csv = buildIssueCsv(prepared, headers);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), issueCsvFileName(fileName));
  };

  const confirmImport = async () => {
    if (!mapping) return;
    setBusy(true);
    try {
      const outcome = await commitImport({
        plan,
        prepared,
        fileName,
        sheetName: sheet?.name ?? null,
        headers,
        mapping,
      });
      setResult(outcome);
      setStep('done');
      showToast({
        message: `${outcome.created + outcome.flagged + outcome.replaced} guests saved on this phone`,
        tone: 'success',
      });
    } catch {
      setError('The import did not finish. No guests were changed. Try again.');
    }
    setBusy(false);
  };

  const titles: Record<Step, string> = {
    file: 'Import guests from a file',
    sheet: 'Which sheet holds the guests?',
    map: 'Check the columns',
    check: 'Check before importing',
    duplicates: 'Guests that may already exist',
    done: 'Import finished',
  };

  return (
    <Dialog open={open} onClose={close} title={titles[step]} footer={footer()}>
      <div className="space-y-4">
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

        {step === 'file' ? <FileStep inputRef={inputRef} busy={busy} onFile={loadFile} /> : null}

        {step === 'sheet' ? (
          <ul className="space-y-2">
            {sheets.map((item, index) => (
              <li key={item.name}>
                <button
                  type="button"
                  className="app-card flex w-full items-center justify-between gap-3 p-3 text-left"
                  onClick={() => {
                    chooseSheet(index);
                    setStep('map');
                  }}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-sm text-muted">{item.rows.length} rows</span>
                  </span>
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-crimson" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {step === 'map' && mapping ? (
          <MapStep
            rows={sheet?.rows ?? []}
            headers={headers}
            headerRowIndex={headerRowIndex}
            mapping={mapping}
            onHeaderRowChange={(index) => {
              setHeaderRowIndex(index);
              setMapping(suggestMapping(sheet?.rows[index] ?? []));
            }}
            onMappingChange={setMapping}
          />
        ) : null}

        {step === 'check' ? (
          <CheckStep prepared={prepared} summary={summary} onDownload={downloadIssues} />
        ) : null}

        {step === 'duplicates' ? (
          <DuplicateStep
            findings={findings}
            prepared={prepared}
            resolutions={resolutions}
            onChange={(rowNumber, resolution) =>
              setResolutions((current) => ({ ...current, [rowNumber]: resolution }))
            }
            onApplyAll={(resolution) =>
              setResolutions(
                Object.fromEntries(findings.map((finding) => [finding.rowNumber, resolution]))
              )
            }
          />
        ) : null}

        {step === 'done' && result ? (
          <DoneStep result={result} hasIssues={summary.warning + summary.rejected > 0} onDownload={downloadIssues} />
        ) : null}
      </div>
    </Dialog>
  );

  function footer() {
    if (step === 'file') {
      return (
        <Button variant="quiet" size="block" onClick={close}>
          Cancel
        </Button>
      );
    }

    if (step === 'done') {
      return (
        <Button size="block" onClick={close}>
          Done
        </Button>
      );
    }

    const issues = mapping ? mappingIssues(mapping) : [];
    const blocked = step === 'map' && (!mapping || mapping.primaryGuestName === null);

    return (
      <div className="space-y-2">
        {step === 'map' && issues.length > 0 ? (
          <p className={blocked ? 'text-xs text-error' : 'text-xs text-warning'}>{issues[0]}</p>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="quiet"
            size="block"
            onClick={() => {
              setError(null);
              if (step === 'map') setStep(sheets.length > 1 ? 'sheet' : 'file');
              else if (step === 'check') setStep('map');
              else if (step === 'duplicates') setStep('check');
              else setStep('file');
            }}
          >
            Back
          </Button>
          {step === 'map' ? (
            <Button size="block" disabled={blocked} onClick={() => setStep('check')}>
              Check {summary.total} rows
            </Button>
          ) : null}
          {step === 'check' ? (
            <Button
              size="block"
              disabled={summary.valid + summary.warning === 0}
              onClick={() => (findings.length > 0 ? setStep('duplicates') : void confirmImport())}
            >
              {findings.length > 0 ? `Review ${findings.length} possible duplicates` : 'Import now'}
            </Button>
          ) : null}
          {step === 'duplicates' ? (
            <Button size="block" pending={busy} onClick={() => void confirmImport()}>
              Import {plan.created + plan.flagged + plan.replaced} guests
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
}

function FileStep({
  inputRef,
  busy,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement>;
  busy: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void onFile(file);
        }}
        className={`rounded-card border-2 border-dashed p-6 text-center ${
          dragging ? 'border-crimson bg-crimson/5' : 'border-hairline bg-white'
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-crimson" aria-hidden />
        <p className="mt-2 text-sm font-medium">Drop your guest list here</p>
        <p className="mt-1 text-sm text-muted">Excel (.xlsx, .xls) or CSV, up to 10 MB</p>
        <div className="mt-3">
          <Button variant="secondary" pending={busy} onClick={() => inputRef.current?.click()}>
            Choose a file
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute('spreadsheet')}
        className="sr-only"
        aria-label="Choose a guest list file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void onFile(file);
        }}
      />

      <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-muted">
        <p className="font-medium text-ink">Columns that are understood automatically</p>
        <p className="mt-1">
          Guest Name, Display Name, WhatsApp Number, Village/City, Side, Guest Count, Notes. Any
          other heading can be matched by hand on the next screen.
        </p>
      </div>
    </div>
  );
}

function MapStep({
  rows,
  headers,
  headerRowIndex,
  mapping,
  onHeaderRowChange,
  onMappingChange,
}: {
  rows: string[][];
  headers: string[];
  headerRowIndex: number;
  mapping: ColumnMapping;
  onHeaderRowChange: (index: number) => void;
  onMappingChange: (mapping: ColumnMapping) => void;
}) {
  const previewRows = rows.slice(headerRowIndex + 1, headerRowIndex + 4);

  return (
    <div className="space-y-4">
      <Field
        label="Which row has the column titles?"
        htmlFor="header-row"
        hint="Rows above this one are ignored"
      >
        <Select
          id="header-row"
          value={String(headerRowIndex)}
          onChange={(event) => onHeaderRowChange(Number(event.target.value))}
        >
          {rows.slice(0, 10).map((row, index) => (
            <option key={index} value={index}>
              Row {index + 1}: {row.filter(Boolean).slice(0, 4).join(', ').slice(0, 50) || '(empty)'}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-3">
        {GUEST_IMPORT_FIELDS.map((field) => (
          <Field
            key={field.id}
            label={field.required ? `${field.label} (needed)` : field.label}
            htmlFor={`map-${field.id}`}
          >
            <Select
              id={`map-${field.id}`}
              value={mapping[field.id] === null ? '' : String(mapping[field.id])}
              onChange={(event) =>
                onMappingChange({
                  ...mapping,
                  [field.id]: event.target.value === '' ? null : Number(event.target.value),
                } as ColumnMapping)
              }
            >
              <option value="">Not in this file</option>
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  {header.trim() || `Column ${index + 1}`}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>

      {previewRows.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-medium">First rows as they will be read</p>
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-xs">
              <thead className="bg-surface text-left">
                <tr>
                  {GUEST_IMPORT_FIELDS.map((field) => (
                    <th key={field.id} scope="col" className="whitespace-nowrap px-2 py-1.5">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-t border-hairline">
                    {GUEST_IMPORT_FIELDS.map((field) => {
                      const column = mapping[field.id as GuestImportField];
                      return (
                        <td key={field.id} className="whitespace-nowrap px-2 py-1.5">
                          {column === null ? '—' : (row[column] ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckStep({
  prepared,
  summary,
  onDownload,
}: {
  prepared: PreparedRow[];
  summary: { total: number; valid: number; warning: number; rejected: number };
  onDownload: () => void;
}) {
  const [tab, setTab] = useState<'all' | 'warning' | 'rejected'>('all');
  const visible = prepared.filter((row) => (tab === 'all' ? true : row.status === tab)).slice(0, 60);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="app-card p-3">
          <p className="text-xl font-semibold text-success">{summary.valid}</p>
          <p className="text-xs text-muted">Ready</p>
        </div>
        <div className="app-card p-3">
          <p className="text-xl font-semibold text-warning">{summary.warning}</p>
          <p className="text-xs text-muted">With a warning</p>
        </div>
        <div className="app-card p-3">
          <p className="text-xl font-semibold text-error">{summary.rejected}</p>
          <p className="text-xs text-muted">Not importable</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Rows with a warning are still imported and marked for a check. Only rows with no name at
        all are left out.
      </p>

      <div className="flex gap-2">
        <Chip active={tab === 'all'} onClick={() => setTab('all')}>
          All {summary.total}
        </Chip>
        <Chip active={tab === 'warning'} onClick={() => setTab('warning')}>
          Warnings {summary.warning}
        </Chip>
        <Chip active={tab === 'rejected'} onClick={() => setTab('rejected')}>
          Not importable {summary.rejected}
        </Chip>
      </div>

      {summary.warning + summary.rejected > 0 ? (
        <Button variant="quiet" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4" aria-hidden />
          Download the rows to check
        </Button>
      ) : null}

      <ul className="space-y-2">
        {visible.map((row) => (
          <li
            key={row.rowNumber}
            className="rounded-lg border border-hairline bg-white p-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">
                {row.draft?.primaryGuestName ?? '(no name)'}
              </span>
              <Badge
                tone={row.status === 'valid' ? 'success' : row.status === 'warning' ? 'warning' : 'error'}
              >
                Row {row.rowNumber}
              </Badge>
            </div>
            {row.issues.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {row.issues.map((issue, index) => (
                  <li key={index}>
                    {fieldLabel(issue.field)}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {prepared.length > visible.length ? (
        <p className="text-xs text-muted">
          Showing the first {visible.length} of {prepared.length} rows.
        </p>
      ) : null}
    </div>
  );
}

function DuplicateStep({
  findings,
  prepared,
  resolutions,
  onChange,
  onApplyAll,
}: {
  findings: ReturnType<typeof findImportDuplicates>;
  prepared: PreparedRow[];
  resolutions: Record<number, DuplicateResolution>;
  onChange: (rowNumber: number, resolution: DuplicateResolution) => void;
  onApplyAll: (resolution: DuplicateResolution) => void;
}) {
  const byRow = new Map(prepared.map((row) => [row.rowNumber, row]));
  const choices = Object.keys(RESOLUTION_LABELS) as DuplicateResolution[];

  return (
    <div className="space-y-4">
      <InlineNotice tone="warning">
        Nothing is merged or replaced on its own. Anything you leave alone is imported as a new
        household and marked for review.
      </InlineNotice>

      <Field label="Use the same choice for all of them" htmlFor="apply-all">
        <Select
          id="apply-all"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) onApplyAll(event.target.value as DuplicateResolution);
          }}
        >
          <option value="">Choose one by one below</option>
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {RESOLUTION_LABELS[choice]}
            </option>
          ))}
        </Select>
      </Field>

      <ul className="space-y-3">
        {findings.map((finding) => {
          const row = byRow.get(finding.rowNumber);
          const chosen = resolutions[finding.rowNumber] ?? 'review-later';
          return (
            <li key={finding.rowNumber} className="app-card space-y-2 p-3">
              <div className="text-sm">
                <p className="font-medium">
                  Row {finding.rowNumber}: {row?.draft?.primaryGuestName ?? ''}
                </p>
                <p className="text-muted">
                  {finding.match.explanation} — {finding.existingLabel}
                </p>
              </div>

              <Field label="What should happen?" htmlFor={`resolution-${finding.rowNumber}`}>
                <Select
                  id={`resolution-${finding.rowNumber}`}
                  value={chosen}
                  onChange={(event) =>
                    onChange(finding.rowNumber, event.target.value as DuplicateResolution)
                  }
                >
                  {choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {RESOLUTION_LABELS[choice]}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-xs text-muted">{RESOLUTION_HELP[chosen]}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DoneStep({
  result,
  hasIssues,
  onDownload,
}: {
  result: Result;
  hasIssues: boolean;
  onDownload: () => void;
}) {
  const lines: Array<[string, number]> = [
    ['Added', result.created],
    ['Added and marked for review', result.flagged],
    ['Existing guests replaced', result.replaced],
    ['Duplicates left alone', result.skipped],
    ['Rows not importable', result.rejected],
  ];

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-hairline text-sm">
        {lines.map(([label, value]) => (
          <li key={label} className="flex justify-between gap-3 py-2">
            <span className="text-muted">{label}</span>
            <span className="tabular-nums">{value}</span>
          </li>
        ))}
      </ul>

      {hasIssues ? (
        <Button variant="quiet" size="block" onClick={onDownload}>
          <Download className="h-4 w-4" aria-hidden />
          Download the rows to check
        </Button>
      ) : null}
    </div>
  );
}
