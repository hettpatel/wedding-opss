import { isEmptyRow } from './csv';

export const GUEST_IMPORT_FIELDS = [
  { id: 'primaryGuestName', label: 'Guest name', required: true },
  { id: 'invitationDisplayName', label: 'Name to print on the card', required: false },
  { id: 'phone', label: 'WhatsApp number', required: false },
  { id: 'village', label: 'Village or city', required: false },
  { id: 'side', label: 'Side', required: false },
  { id: 'guestCount', label: 'Number of guests', required: false },
  { id: 'notes', label: 'Notes', required: false },
] as const;

export type GuestImportField = (typeof GUEST_IMPORT_FIELDS)[number]['id'];

/** Column index for each field, or null when that column is not in the file. */
export type ColumnMapping = Record<GuestImportField, number | null>;

export const EMPTY_MAPPING: ColumnMapping = {
  primaryGuestName: null,
  invitationDisplayName: null,
  phone: null,
  village: null,
  side: null,
  guestCount: null,
  notes: null,
};

const ALIASES: Record<GuestImportField, string[]> = {
  primaryGuestName: ['guest name', 'name', 'guest', 'full name', 'household', 'primary guest', 'guestname', 'naam'],
  invitationDisplayName: ['display name', 'invitation name', 'card name', 'print name', 'display', 'invitation display name'],
  phone: ['whatsapp number', 'whatsapp', 'whatsapp no', 'phone', 'phone number', 'mobile', 'mobile number', 'contact', 'contact number', 'number'],
  village: ['village', 'city', 'village city', 'village or city', 'town', 'place', 'gaam'],
  side: ['side', 'party', 'from', 'relation', 'groom or bride'],
  guestCount: ['guest count', 'count', 'members', 'pax', 'persons', 'no of guests', 'number of guests', 'guests'],
  notes: ['notes', 'note', 'remark', 'remarks', 'comment', 'comments'],
};

export function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Picks the row that looks like column titles: mostly text, few numbers, and the widest
 * set of filled cells in the first few rows. Returns 0 when nothing stands out.
 */
export function detectHeaderRow(rows: string[][], lookahead = 8): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(rows.length, lookahead); index += 1) {
    const row = rows[index];
    if (isEmptyRow(row) || !row) continue;

    const filled = row.filter((cell) => cell.trim() !== '');
    if (filled.length === 0) continue;

    const numeric = filled.filter((cell) => /^[\d.,+\-\s]+$/.test(cell)).length;
    const known = filled.filter((cell) => fieldForHeader(cell) !== null).length;

    const score = filled.length + known * 4 - numeric * 3 - index * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function fieldForHeader(header: string): GuestImportField | null {
  const key = normaliseHeader(header);
  if (!key) return null;

  for (const field of GUEST_IMPORT_FIELDS) {
    if (ALIASES[field.id].includes(key)) return field.id;
  }
  for (const field of GUEST_IMPORT_FIELDS) {
    if (ALIASES[field.id].some((alias) => key.includes(alias) || alias.includes(key))) {
      return field.id;
    }
  }
  return null;
}

/** First match wins, so a sheet with both "Name" and "Display Name" maps each one once. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ...EMPTY_MAPPING };
  const taken = new Set<number>();

  headers.forEach((header, index) => {
    const field = fieldForHeader(header);
    if (!field || mapping[field] !== null || taken.has(index)) return;
    mapping[field] = index;
    taken.add(index);
  });

  return mapping;
}

export function mappingIssues(mapping: ColumnMapping): string[] {
  const issues: string[] = [];
  if (mapping.primaryGuestName === null) {
    issues.push('Choose which column holds the guest name. Nothing can be imported without it.');
  }
  if (mapping.phone === null) {
    issues.push('No WhatsApp number column is selected. Guests will be imported without a number.');
  }
  return issues;
}
