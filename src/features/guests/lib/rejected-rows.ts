import { toCsv } from './csv';
import { fieldLabel, type PreparedRow } from './guest-import';

/**
 * Builds a CSV of everything that was not imported cleanly, with the reason attached,
 * so the original file can be corrected and imported again.
 */
export function buildIssueCsv(rows: PreparedRow[], headers: string[]): string {
  const columns = headers.map((header, index) => header.trim() || `Column ${index + 1}`);
  const output: Array<Array<string | number | null>> = [
    ['Row', ...columns, 'Result', 'Reason'],
  ];

  for (const row of rows) {
    if (row.status === 'valid') continue;
    const reason = row.issues
      .map((issue) => `${fieldLabel(issue.field)}: ${issue.message}`)
      .join(' | ');
    output.push([
      row.rowNumber,
      ...columns.map((column) => row.raw[column] ?? ''),
      row.status === 'rejected' ? 'Not imported' : 'Imported with a warning',
      reason,
    ]);
  }

  return toCsv(output);
}

export function issueCsvFileName(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 50);
  return `${base || 'guest_import'}_rows_to_check.csv`;
}
