import type { FontChoice } from '@/lib/models';

export const FONT_LABELS: Record<FontChoice, string> = {
  serif: 'Serif',
  sans: 'Sans serif',
  script: 'Script or italic',
};

/** CSS stacks used only for on-screen chrome; measurement never relies on them. */
export const FONT_CSS: Record<FontChoice, string> = {
  serif: '"Liberation Serif", "Times New Roman", Times, serif',
  sans: '"Liberation Sans", Arial, Helvetica, sans-serif',
  script: '"Liberation Serif", "Times New Roman", Times, serif',
};

export const FONT_CSS_STYLE: Record<FontChoice, 'normal' | 'italic'> = {
  serif: 'normal',
  sans: 'normal',
  script: 'italic',
};

/**
 * Font files bundled with the app, tried in order. All are SIL Open Font License, which
 * permits embedding into generated PDFs - see public/fonts/LICENSE.txt.
 *
 * "script" looks for an optional script.ttf first. None is shipped, because no cursive
 * face with a redistributable licence was available; drop one in and it is picked up.
 */
export const FONT_FILES: Record<FontChoice, string[]> = {
  serif: ['/fonts/serif.ttf'],
  sans: ['/fonts/sans.ttf'],
  script: ['/fonts/script.ttf', '/fonts/serif-italic.ttf'],
};

/** Used only when no bundled file can be read at all. These are not embedded fonts. */
export const FONT_FALLBACK_STANDARD: Record<FontChoice, 'TimesRoman' | 'Helvetica' | 'TimesRomanItalic'> = {
  serif: 'TimesRoman',
  sans: 'Helvetica',
  script: 'TimesRomanItalic',
};
