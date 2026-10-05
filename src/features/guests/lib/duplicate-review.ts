import { findDuplicates, type DuplicateInput, type DuplicateMatch } from '@/lib/guests/duplicates';
import type { PreparedRow } from './guest-import';

export type DuplicateResolution =
  | 'keep-existing'
  | 'replace-existing'
  | 'add-separate'
  | 'skip'
  | 'review-later';

export const RESOLUTION_LABELS: Record<DuplicateResolution, string> = {
  'keep-existing': 'Keep the existing guest',
  'replace-existing': 'Replace the existing guest',
  'add-separate': 'Add as a separate household',
  skip: 'Skip this row',
  'review-later': 'Import and flag for review',
};

export const RESOLUTION_HELP: Record<DuplicateResolution, string> = {
  'keep-existing': 'Nothing changes. The row in the file is not imported.',
  'replace-existing': 'The existing guest keeps its place but takes the values from the file.',
  'add-separate': 'Both are kept as two different households.',
  skip: 'Nothing is imported for this row. You can import it again later.',
  'review-later': 'Imported as a new household and marked "Needs Review" so you can decide later.',
};

/** Nothing is overwritten unless the person picks it, so the safe option is the default. */
export const DEFAULT_RESOLUTION: DuplicateResolution = 'review-later';

export interface DuplicateFinding {
  rowNumber: number;
  match: DuplicateMatch;
  existingLabel: string;
}

export function findImportDuplicates(
  rows: PreparedRow[],
  existing: Array<DuplicateInput & { id: string; label: string }>
): DuplicateFinding[] {
  const findings: DuplicateFinding[] = [];
  const labels = new Map(existing.map((item) => [item.id, item.label]));

  for (const row of rows) {
    if (!row.draft) continue;
    const matches = findDuplicates(
      {
        primaryGuestName: row.draft.primaryGuestName,
        invitationDisplayName: row.draft.invitationDisplayName,
        normalizedPhone: row.draft.normalizedPhone,
        village: row.draft.village,
      },
      existing
    );
    const best = matches[0];
    if (!best) continue;
    findings.push({
      rowNumber: row.rowNumber,
      match: best,
      existingLabel: labels.get(best.existingId) ?? 'an existing guest',
    });
  }

  return findings;
}

export interface ImportAction {
  row: PreparedRow;
  kind: 'create' | 'create-flagged' | 'replace';
  replaceExistingId?: string;
}

export interface ImportPlan {
  actions: ImportAction[];
  created: number;
  flagged: number;
  replaced: number;
  skippedDuplicates: number;
  rejected: number;
}

/**
 * Turns the prepared rows plus the person's duplicate decisions into an explicit list of
 * writes. Rows with no decision are never touched by accident: a duplicate without a
 * resolution falls back to the safe default.
 */
export function buildImportPlan(
  rows: PreparedRow[],
  findings: DuplicateFinding[],
  resolutions: Record<number, DuplicateResolution>
): ImportPlan {
  const byRow = new Map(findings.map((finding) => [finding.rowNumber, finding]));
  const plan: ImportPlan = {
    actions: [],
    created: 0,
    flagged: 0,
    replaced: 0,
    skippedDuplicates: 0,
    rejected: 0,
  };

  for (const row of rows) {
    if (row.status === 'rejected' || !row.draft) {
      plan.rejected += 1;
      continue;
    }

    const finding = byRow.get(row.rowNumber);
    if (!finding) {
      plan.actions.push({ row, kind: 'create' });
      plan.created += 1;
      continue;
    }

    const resolution = resolutions[row.rowNumber] ?? DEFAULT_RESOLUTION;

    switch (resolution) {
      case 'keep-existing':
      case 'skip':
        plan.skippedDuplicates += 1;
        break;
      case 'replace-existing':
        plan.actions.push({ row, kind: 'replace', replaceExistingId: finding.match.existingId });
        plan.replaced += 1;
        break;
      case 'add-separate':
        plan.actions.push({ row, kind: 'create' });
        plan.created += 1;
        break;
      case 'review-later':
      default:
        plan.actions.push({ row, kind: 'create-flagged' });
        plan.flagged += 1;
        break;
    }
  }

  return plan;
}
