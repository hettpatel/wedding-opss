import { describe, expect, it } from 'vitest';
import { EMPTY_MAPPING } from './column-mapping';
import { prepareRows, type PreparedRow } from './guest-import';
import { buildImportPlan, findImportDuplicates, DEFAULT_RESOLUTION } from './duplicate-review';

const headers = ['Guest Name', 'WhatsApp Number', 'Village'];
const mapping = { ...EMPTY_MAPPING, primaryGuestName: 0, phone: 1, village: 2 };

const prepare = (rows: string[][]): PreparedRow[] =>
  prepareRows([headers, ...rows], { mapping, headerRowIndex: 0, headers, defaultCountryCode: '91' });

const existing = [
  {
    id: 'g1',
    label: 'Rameshbhai Patel',
    primaryGuestName: 'Rameshbhai Patel',
    invitationDisplayName: 'Mr. & Mrs. Rameshbhai Patel',
    normalizedPhone: '919876543210',
    village: 'Kahoda',
  },
];

describe('findImportDuplicates', () => {
  it('spots a guest who is already saved', () => {
    const rows = prepare([['Ramesh Patel', '9876543210', 'Kahoda']]);
    const findings = findImportDuplicates(rows, existing);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.match.reason).toBe('phone');
    expect(findings[0]?.existingLabel).toBe('Rameshbhai Patel');
  });

  it('leaves a genuinely new guest alone', () => {
    expect(findImportDuplicates(prepare([['Kiran Thakor', '9123456780', 'Unjha']]), existing)).toHaveLength(0);
  });
});

describe('buildImportPlan', () => {
  const rows = prepare([
    ['Ramesh Patel', '9876543210', 'Kahoda'],
    ['Kiran Thakor', '9123456780', 'Unjha'],
    ['', '', 'Kahoda'],
  ]);
  const findings = findImportDuplicates(rows, existing);

  it('imports new guests and flags undecided duplicates instead of merging them', () => {
    const plan = buildImportPlan(rows, findings, {});
    expect(plan.created).toBe(1);
    expect(plan.flagged).toBe(1);
    expect(plan.replaced).toBe(0);
    expect(plan.rejected).toBe(1);
    expect(DEFAULT_RESOLUTION).toBe('review-later');
  });

  it('keeps the existing guest and imports nothing for that row', () => {
    const plan = buildImportPlan(rows, findings, { 2: 'keep-existing' });
    expect(plan.skippedDuplicates).toBe(1);
    expect(plan.actions.some((action) => action.row.rowNumber === 2)).toBe(false);
  });

  it('replaces only when the person asks for it, and names the record to replace', () => {
    const plan = buildImportPlan(rows, findings, { 2: 'replace-existing' });
    expect(plan.replaced).toBe(1);
    const action = plan.actions.find((item) => item.row.rowNumber === 2);
    expect(action?.kind).toBe('replace');
    expect(action?.replaceExistingId).toBe('g1');
  });

  it('can add a duplicate as a separate household', () => {
    const plan = buildImportPlan(rows, findings, { 2: 'add-separate' });
    expect(plan.created).toBe(2);
    expect(plan.flagged).toBe(0);
  });

  it('never writes a rejected row', () => {
    const plan = buildImportPlan(rows, findings, {});
    expect(plan.actions.every((action) => action.row.draft !== null)).toBe(true);
  });
});
