import { normalizePhone, type PhoneStatus } from '@/lib/format/phone';
import { isEmptyRow } from './csv';
import { GUEST_IMPORT_FIELDS, type ColumnMapping, type GuestImportField } from './column-mapping';
import type { GuestSide } from '@/lib/models/enums';

export type RowStatus = 'valid' | 'warning' | 'rejected';

export interface RowIssue {
  field: GuestImportField | 'row';
  message: string;
  severity: 'warning' | 'rejected';
}

export interface GuestDraft {
  primaryGuestName: string;
  invitationDisplayName: string;
  rawPhone: string | null;
  normalizedPhone: string | null;
  countryCode: string | null;
  village: string | null;
  side: GuestSide;
  expectedGuestCount: number | null;
  notes: string | null;
  needsReview: boolean;
  phoneStatus: PhoneStatus;
}

export interface PreparedRow {
  /** 1-based row number in the original sheet, so the person can find it again. */
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  issues: RowIssue[];
  draft: GuestDraft | null;
}

export interface PrepareOptions {
  mapping: ColumnMapping;
  headerRowIndex: number;
  headers: string[];
  defaultCountryCode: string;
}

const SIDE_WORDS: Array<[RegExp, GuestSide]> = [
  [/^(groom|boy|var|varpaksh|v|g)$/i, 'Groom'],
  [/^(bride|girl|kanya|kanyapaksh|b)$/i, 'Bride'],
  [/^(common|both|mutual|c)$/i, 'Common'],
];

function cell(row: string[], index: number | null): string {
  if (index === null) return '';
  return (row[index] ?? '').toString().trim();
}

export function parseSide(value: string): { side: GuestSide; recognised: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { side: 'Common', recognised: true };
  for (const [pattern, side] of SIDE_WORDS) {
    if (pattern.test(trimmed)) return { side, recognised: true };
  }
  return { side: 'Common', recognised: false };
}

export function parseGuestCount(value: string): { count: number | null; recognised: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { count: null, recognised: true };
  const digits = trimmed.match(/\d+/);
  if (!digits) return { count: null, recognised: false };
  const count = Number(digits[0]);
  if (!Number.isFinite(count) || count < 0 || count > 999) return { count: null, recognised: false };
  return { count, recognised: true };
}

const PHONE_MESSAGES: Partial<Record<PhoneStatus, string>> = {
  missing: 'No WhatsApp number. The guest is still imported.',
  invalid: 'This number does not look right. Check it before sending.',
  landline: 'This looks like a landline. WhatsApp will not reach it.',
  multiple: 'More than one number in this cell. Pick one later.',
  'contains-text': 'This number contains letters. Check it before sending.',
};

/**
 * Turns sheet rows into checked drafts. A row is only rejected when there is no name at
 * all - a missing or odd phone number is always a warning, never a reason to drop a guest.
 */
export function prepareRows(rows: string[][], options: PrepareOptions): PreparedRow[] {
  const { mapping, headerRowIndex, headers, defaultCountryCode } = options;
  const prepared: PreparedRow[] = [];
  const phoneSeenAtRow = new Map<string, number>();

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || isEmptyRow(row)) continue;

    const rowNumber = index + 1;
    const issues: RowIssue[] = [];
    const raw: Record<string, string> = {};

    headers.forEach((header, columnIndex) => {
      const label = header.trim() || `Column ${columnIndex + 1}`;
      raw[label] = (row[columnIndex] ?? '').toString().trim();
    });

    const name = cell(row, mapping.primaryGuestName);
    const displayRaw = cell(row, mapping.invitationDisplayName);

    if (!name && !displayRaw) {
      prepared.push({
        rowNumber,
        raw,
        status: 'rejected',
        issues: [
          { field: 'primaryGuestName', message: 'No guest name in this row', severity: 'rejected' },
        ],
        draft: null,
      });
      continue;
    }

    const primaryGuestName = name || displayRaw;
    const invitationDisplayName = displayRaw || primaryGuestName;

    const rawPhone = cell(row, mapping.phone);
    const phone = normalizePhone(rawPhone, defaultCountryCode);
    if (phone.status !== 'ok') {
      issues.push({
        field: 'phone',
        message: PHONE_MESSAGES[phone.status] ?? 'Check this number.',
        severity: 'warning',
      });
    } else if (phone.normalized) {
      const earlier = phoneSeenAtRow.get(phone.normalized);
      if (earlier) {
        issues.push({
          field: 'phone',
          message: `The same number is already on row ${earlier} of this file`,
          severity: 'warning',
        });
      } else {
        phoneSeenAtRow.set(phone.normalized, rowNumber);
      }
    }

    const sideCell = cell(row, mapping.side);
    const side = parseSide(sideCell);
    if (!side.recognised) {
      issues.push({
        field: 'side',
        message: `"${sideCell}" was not understood, so this is set to Common`,
        severity: 'warning',
      });
    }

    const countCell = cell(row, mapping.guestCount);
    const count = parseGuestCount(countCell);
    if (!count.recognised) {
      issues.push({
        field: 'guestCount',
        message: `"${countCell}" is not a number, so the guest count was left empty`,
        severity: 'warning',
      });
    }

    const village = cell(row, mapping.village);
    const notes = cell(row, mapping.notes);
    const needsReview = phone.status !== 'ok';

    prepared.push({
      rowNumber,
      raw,
      status: issues.length > 0 ? 'warning' : 'valid',
      issues,
      draft: {
        primaryGuestName,
        invitationDisplayName,
        rawPhone: rawPhone || null,
        normalizedPhone: phone.normalized,
        countryCode: phone.countryCode,
        village: village || null,
        side: side.side,
        expectedGuestCount: count.count,
        notes: notes || null,
        needsReview,
        phoneStatus: phone.status,
      },
    });
  }

  return prepared;
}

export interface PreparedSummary {
  total: number;
  valid: number;
  warning: number;
  rejected: number;
}

export function summarisePrepared(rows: PreparedRow[]): PreparedSummary {
  return {
    total: rows.length,
    valid: rows.filter((row) => row.status === 'valid').length,
    warning: rows.filter((row) => row.status === 'warning').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
  };
}

export function fieldLabel(field: GuestImportField | 'row'): string {
  if (field === 'row') return 'Row';
  return GUEST_IMPORT_FIELDS.find((item) => item.id === field)?.label ?? field;
}
