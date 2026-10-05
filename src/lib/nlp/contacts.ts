import { makeSpan, type Extraction } from './types';

/** Indian mobile shapes plus a general international form. Nothing is invented. */
const PHONE_PATTERNS: RegExp[] = [
  /(?:\+91[\s-]?|\b0091[\s-]?|\b91[\s-]?)([6-9]\d{4}[\s-]?\d{5})\b/,
  /\b0?([6-9]\d{4}[\s-]?\d{5})\b/,
  /\+(\d{1,3})[\s-]?(\d{6,12})\b/,
];

export function extractPhone(text: string): Extraction<string> | null {
  for (const pattern of PHONE_PATTERNS) {
    const match = text.match(pattern);
    if (!match || match.index === undefined) continue;
    return {
      value: match[0].trim(),
      span: makeSpan(text, match.index, match.index + match[0].length),
      confidence: 0.85,
    };
  }
  return null;
}

const VENDOR_TRIGGERS =
  /\b(?:from|with|call|contact|book|order\s+to|vendor|ask|through|via)\s+([^,.;]{2,40})/i;

const VENDOR_STOPWORDS = new Set([
  'the', 'a', 'an', 'my', 'our', 'his', 'her', 'their', 'this', 'that', 'next', 'last',
  'today', 'tomorrow', 'morning', 'evening', 'night', 'week', 'month', 'sunday', 'monday',
  'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'him', 'them', 'shop', 'market',
  'phone', 'whatsapp', 'quotation', 'quote', 'budget', 'price',
  'for', 'and', 'to', 'at', 'in', 'of', 'on', 'by', 'about', 'regarding', 'before', 'after',
]);

/**
 * Best-effort vendor detection. Always returned with low confidence and flagged for
 * checking - a wrong vendor name is worse than an empty field.
 */
export function extractVendor(text: string): Extraction<string> | null {
  const match = text.match(VENDOR_TRIGGERS);
  if (!match || match.index === undefined || !match[1]) return null;

  const words = match[1].trim().split(/\s+/);
  const taken: string[] = [];

  for (const word of words.slice(0, 3)) {
    const bare = word.replace(/[^\p{L}\p{N}&.-]/gu, '');
    if (!bare) break;
    if (VENDOR_STOPWORDS.has(bare.toLowerCase())) break;
    if (/^\d+$/.test(bare)) break;
    taken.push(bare);
  }

  if (taken.length === 0) return null;

  const value = taken.join(' ');
  const start = match.index + match[0].indexOf(match[1]);
  return {
    value,
    span: makeSpan(text, start, start + value.length),
    confidence: 0.45,
  };
}
