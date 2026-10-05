import { parseInrAmount } from '../format/currency';
import { makeSpan, type Extraction } from './types';

/**
 * Money is only recognised with an explicit signal: a rupee symbol, a money word
 * ("budget", "rs", "rupees", "cost"), or a scale suffix ("75k", "1.5 lakh").
 * A bare number is never assumed to be an amount.
 */
const MONEY_PATTERNS: RegExp[] = [
  /(?:₹|\brs\.?\b|\binr\b)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crores?|cr)?\b/i,
  /\b(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crores?|cr)\b/i,
  /\b(?:budget|cost|costs|price|quote|quotation|amount|charges?|rate|advance|rupees?)\s*(?:of|is|about|around|approx\.?|upto|up to)?\s*(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crores?|cr)?\b/i,
  /\b(\d[\d,]*(?:\.\d+)?)\s*(?:rupees?|rs\.?)\b/i,
];

export function extractAmount(text: string): Extraction<number> | null {
  for (const pattern of MONEY_PATTERNS) {
    const match = text.match(pattern);
    if (!match || match.index === undefined) continue;
    const value = parseInrAmount(match[0]);
    if (value === null || value <= 0) continue;
    return {
      value,
      span: makeSpan(text, match.index, match.index + match[0].length),
      confidence: 0.9,
    };
  }
  return null;
}

const UNITS = [
  'kg', 'kgs', 'kilo', 'kilos', 'gram', 'grams', 'litre', 'litres', 'liter', 'liters', 'ltr',
  'box', 'boxes', 'piece', 'pieces', 'pcs', 'plate', 'plates', 'thali', 'thalis',
  'bus', 'buses', 'car', 'cars', 'tempo', 'room', 'rooms', 'chair', 'chairs',
  'packet', 'packets', 'bag', 'bags', 'set', 'sets', 'person', 'people', 'guest', 'guests',
  'nos', 'units', 'dozen', 'quintal', 'mattress', 'mattresses', 'tables', 'table',
];

export interface Quantity {
  value: number;
  unit: string;
}

export function extractQuantity(text: string): Extraction<Quantity> | null {
  const pattern = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(${UNITS.join('|')})\\b`, 'i');
  const match = text.match(pattern);
  if (!match || match.index === undefined || !match[1] || !match[2]) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  return {
    value: { value, unit: match[2].toLowerCase() },
    span: makeSpan(text, match.index, match.index + match[0].length),
    confidence: 0.85,
  };
}
