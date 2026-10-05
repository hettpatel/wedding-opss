export const MERGE_TAGS = [
  '{Guest Name}',
  '{Village}',
  '{Event Dates}',
  '{Venue}',
  '{Map Link}',
] as const;

export type MergeTag = (typeof MERGE_TAGS)[number];

export interface MergeValues {
  guestName: string;
  village: string;
  eventDates: string;
  venue: string;
  mapLink: string;
}

const TAG_KEYS: Record<string, keyof MergeValues> = {
  'guest name': 'guestName',
  village: 'village',
  'event dates': 'eventDates',
  venue: 'venue',
  'map link': 'mapLink',
};

export const DEFAULT_MESSAGE_TEMPLATE =
  'Jai Shree Umiya Mataji! Dear {Guest Name}, we cordially invite you and your family to join us for our wedding functions from {Event Dates} at {Venue}. Please find your personal invitation attached.';

/** Replaces known tags. Unknown tags are left untouched so nothing disappears silently. */
export function renderMessage(template: string, values: MergeValues): string {
  return template.replace(/\{\s*([^{}]+?)\s*\}/g, (whole, inner: string) => {
    const key = TAG_KEYS[inner.trim().toLowerCase()];
    if (!key) return whole;
    const value = values[key];
    return value && value.trim() ? value : '';
  });
}

export function findUnknownTags(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\s*([^{}]+?)\s*\}/g)) {
    const inner = (match[1] ?? '').trim();
    if (!TAG_KEYS[inner.toLowerCase()]) found.add(`{${inner}}`);
  }
  return Array.from(found);
}

export function findEmptyTagValues(template: string, values: MergeValues): string[] {
  const missing: string[] = [];
  for (const match of template.matchAll(/\{\s*([^{}]+?)\s*\}/g)) {
    const inner = (match[1] ?? '').trim();
    const key = TAG_KEYS[inner.toLowerCase()];
    if (key && !values[key]?.trim()) missing.push(`{${inner}}`);
  }
  return Array.from(new Set(missing));
}
