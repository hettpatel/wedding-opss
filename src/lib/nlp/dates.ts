import { addDays, addMonths, addWeeks, isValid, parse, startOfDay } from 'date-fns';
import { toIsoDate } from '../format/date';
import { makeSpan, type Extraction } from './types';

export interface DateHit {
  iso: string;
  kind: 'relative' | 'weekday' | 'explicit' | 'anchor';
  note: string | null;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, ravivar: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const WEEKDAY_PATTERN = Object.keys(WEEKDAYS).join('|');

export interface DateParseOptions {
  now: Date;
  /** Only used for phrases like "before the wedding". Null means no date is produced. */
  weddingDate?: string | null;
}

/**
 * Finds the first date expression in the sentence.
 * Rules that matter: a date is only returned when the text actually contains one.
 * "this Sunday" is the coming Sunday (today if today is Sunday); a bare or "next"
 * weekday is the next future occurrence. Assumptions are reported in `note`.
 */
export function extractDate(
  text: string,
  options: DateParseOptions
): Extraction<DateHit> | null {
  const lower = text.toLowerCase();
  const today = startOfDay(options.now);

  const simple: Array<[RegExp, (m: RegExpMatchArray) => DateHit | null]> = [
    [/\bday\s+after\s+tomorrow\b/, () => rel(addDays(today, 2))],
    [/\btomorrow\b/, () => rel(addDays(today, 1))],
    [/\b(today|tonight|aaje)\b/, () => rel(today)],
    [/\bday\s+before\s+yesterday\b/, () => rel(addDays(today, -2))],
    [/\byesterday\b/, () => rel(addDays(today, -1))],
    [/\bnext\s+week\b/, () => rel(addWeeks(today, 1), 'Read "next week" as 7 days from today')],
    [/\bthis\s+week\b/, () => rel(addDays(today, 7 - today.getDay()), 'Read "this week" as the end of this week')],
    [/\bnext\s+month\b/, () => rel(addMonths(today, 1), 'Read "next month" as one month from today')],
    [/\bin\s+(\d{1,3})\s+days?\b/, (m) => rel(addDays(today, Number(m[1])))],
    [/\bafter\s+(\d{1,3})\s+days?\b/, (m) => rel(addDays(today, Number(m[1])))],
    [/\bin\s+(\d{1,2})\s+weeks?\b/, (m) => rel(addWeeks(today, Number(m[1])))],
  ];

  for (const [pattern, build] of simple) {
    const match = lower.match(pattern);
    if (match && match.index !== undefined) {
      const hit = build(match);
      if (hit) {
        return {
          value: hit,
          span: makeSpan(text, match.index, match.index + match[0].length),
          confidence: 0.95,
        };
      }
    }
  }

  const weekdayMatch = lower.match(
    new RegExp(`\\b(this|next|coming|aavta)?\\s*(${WEEKDAY_PATTERN})\\b`)
  );
  if (weekdayMatch && weekdayMatch.index !== undefined) {
    const qualifier = (weekdayMatch[1] ?? '').trim();
    const targetDay = WEEKDAYS[weekdayMatch[2] ?? ''] ?? 0;
    const diff = (targetDay - today.getDay() + 7) % 7;
    const useToday = qualifier === 'this' && diff === 0;
    const offset = useToday ? 0 : diff === 0 ? 7 : diff;
    const note =
      qualifier === 'next'
        ? 'Read this as the coming week day. Change the date if you meant the week after.'
        : null;
    return {
      value: { iso: toIsoDate(addDays(today, offset)), kind: 'weekday', note },
      span: makeSpan(text, weekdayMatch.index, weekdayMatch.index + weekdayMatch[0].length),
      confidence: qualifier ? 0.8 : 0.65,
    };
  }

  const explicit = extractExplicitDate(text, options.now);
  if (explicit) return explicit;

  const weddingPhrase = lower.match(/\b(?:before|by|for)\s+the\s+wedding(?:\s+day)?\b/);
  if (weddingPhrase && weddingPhrase.index !== undefined) {
    const index = weddingPhrase.index;
    if (options.weddingDate) {
      return {
        value: {
          iso: options.weddingDate,
          kind: 'anchor',
          note: 'Set to the wedding date from Settings. Change it if the work must finish earlier.',
        },
        span: makeSpan(text, index, index + weddingPhrase[0].length),
        confidence: 0.5,
      };
    }
    return null; // No wedding date saved, so no date is invented.
  }

  return null;

  function rel(date: Date, note: string | null = null): DateHit {
    return { iso: toIsoDate(date), kind: 'relative', note };
  }
}

/**
 * Reads the first real date out of the free-text "Event dates" setting, so sentences like
 * "before the wedding" have something to anchor to. Returns null when the setting is empty
 * or has no recognisable date - no date is ever guessed.
 */
export function deriveWeddingDate(
  eventDates: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!eventDates?.trim()) return null;
  return extractExplicitDate(eventDates, now)?.value.iso ?? null;
}

const MONTHS =
  'jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december';

/** Handles 12/06/2026, 12-6-26, "5 June", "June 5th", with the day first (Indian convention). */
export function extractExplicitDate(text: string, now: Date): Extraction<DateHit> | null {
  const lower = text.toLowerCase();

  const numeric = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric && numeric.index !== undefined) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const yearRaw = numeric[3];
    const year = yearRaw
      ? yearRaw.length === 2
        ? 2000 + Number(yearRaw)
        : Number(yearRaw)
      : now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, day);
      if (isValid(date)) {
        return {
          value: {
            iso: toIsoDate(date),
            kind: 'explicit',
            note: yearRaw ? null : 'Year was not written, so the current year was used.',
          },
          span: makeSpan(text, numeric.index, numeric.index + numeric[0].length),
          confidence: yearRaw ? 0.9 : 0.75,
        };
      }
    }
  }

  const dayFirst = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\.?\\s*(\\d{4})?\\b`));
  const monthFirst = lower.match(new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(\\d{4})?\\b`));
  const chosen = dayFirst ?? monthFirst;
  if (chosen && chosen.index !== undefined) {
    const isDayFirst = chosen === dayFirst;
    const dayText = isDayFirst ? chosen[1] : chosen[2];
    const monthText = isDayFirst ? chosen[2] : chosen[1];
    const yearText = chosen[3];
    const year = yearText ? Number(yearText) : now.getFullYear();
    const parsed = parse(`${dayText} ${monthText} ${year}`, 'd MMMM yyyy', now);
    const fallback = parse(`${dayText} ${monthText} ${year}`, 'd MMM yyyy', now);
    const date = isValid(parsed) ? parsed : fallback;
    if (isValid(date)) {
      return {
        value: {
          iso: toIsoDate(date),
          kind: 'explicit',
          note: yearText ? null : 'Year was not written, so the current year was used.',
        },
        span: makeSpan(text, chosen.index, chosen.index + chosen[0].length),
        confidence: yearText ? 0.9 : 0.75,
      };
    }
  }

  return null;
}
