import { parseCsv } from './csv';

export interface SheetData {
  name: string;
  rows: string[][];
}

/**
 * Reads a spreadsheet into plain strings. CSV is handled locally; Excel files load the
 * SheetJS reader only when one is actually opened, so the rest of the app stays small.
 */
export async function readWorkbook(file: File): Promise<SheetData[]> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.csv')) {
    const text = await file.text();
    return [{ name: file.name, rows: parseCsv(text) }];
  }

  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return { name, rows: [] };
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });
    return {
      name,
      rows: rows.map((row) =>
        (Array.isArray(row) ? row : []).map((cell) =>
          cell === null || cell === undefined ? '' : String(cell).trim()
        )
      ),
    };
  });
}
