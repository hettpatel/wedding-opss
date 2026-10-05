export interface FileRule {
  /** Extensions without the dot, lower case. */
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
  label: string;
}

export const FILE_RULES = {
  attachment: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxBytes: 5 * 1024 * 1024,
    label: 'photo or PDF',
  },
  invitationTemplate: {
    extensions: ['png', 'jpg', 'jpeg', 'pdf'],
    mimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    maxBytes: 12 * 1024 * 1024,
    label: 'invitation image or single-page PDF',
  },
  spreadsheet: {
    extensions: ['xlsx', 'xls', 'csv'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      '',
    ],
    maxBytes: 10 * 1024 * 1024,
    label: 'Excel or CSV file',
  },
  backup: {
    extensions: ['json'],
    mimeTypes: ['application/json', 'text/plain', ''],
    maxBytes: 100 * 1024 * 1024,
    label: 'backup file',
  },
} satisfies Record<string, FileRule>;

export type FileRuleName = keyof typeof FILE_RULES;

export interface FileValidationResult {
  ok: boolean;
  error: string | null;
}

export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index + 1).toLowerCase();
}

export function validateFile(file: File, ruleName: FileRuleName): FileValidationResult {
  const rule = FILE_RULES[ruleName];
  const extension = extensionOf(file.name);

  if (!rule.extensions.includes(extension)) {
    return {
      ok: false,
      error: `Choose a ${rule.label}. This one is a .${extension || 'unknown'} file.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: 'This file is empty. Choose another one.' };
  }
  if (file.size > rule.maxBytes) {
    const limitMb = Math.round(rule.maxBytes / (1024 * 1024));
    return { ok: false, error: `This file is larger than ${limitMb} MB. Choose a smaller one.` };
  }
  return { ok: true, error: null };
}

export function acceptAttribute(ruleName: FileRuleName): string {
  const rule = FILE_RULES[ruleName];
  return rule.extensions.map((ext) => `.${ext}`).join(',');
}
