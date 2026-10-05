const RESERVED_WINDOWS_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/** Turns any guest name into a safe file-name fragment: "Mr. & Mrs. Ramesh Patel" -> "Mr_Mrs_Ramesh_Patel". */
export function sanitizeFileNamePart(input: string | null | undefined, fallback = 'Guest'): string {
  const base = (input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
    .replace(/_$/, '');

  if (!base) return fallback;
  if (RESERVED_WINDOWS_NAMES.has(base.toLowerCase())) return `${base}_file`;
  return base;
}

export function invitationFileName(displayName: string | null | undefined): string {
  return `Wedding_Invitation_${sanitizeFileNamePart(displayName)}.pdf`;
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `wedding-ops-backup-${stamp}.json`;
}
