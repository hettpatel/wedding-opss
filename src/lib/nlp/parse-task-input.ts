import type { TaskPriority } from '../models/task';
import { extractAmount, extractQuantity } from './amounts';
import { classifyCategory, extractPriority, type CategoryCandidate } from './classify';
import { extractPhone, extractVendor } from './contacts';
import { extractDate } from './dates';
import { removeSpans, type Span } from './types';

export type MissingField = 'date' | 'quantity' | 'vendor' | 'budget' | 'phone';

export interface ParsedTaskDraft {
  title: string;
  /** Always the untouched sentence, so nothing the person said is ever lost. */
  originalInput: string;
  details: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priority: TaskPriority;
  targetDate: string | null;
  reminderDate: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  estimatedExpense: number | null;
  quantityValue: number | null;
  quantityUnit: string | null;
  /** Fields the parser is unsure about. The form highlights these. */
  uncertainFields: string[];
  missingFields: MissingField[];
  notes: string[];
  confidence: number;
}

export interface ParseOptions {
  now?: Date;
  categories: CategoryCandidate[];
  weddingDate?: string | null;
}

const MAX_TITLE_LENGTH = 90;

export function parseTaskInput(input: string, options: ParseOptions): ParsedTaskDraft {
  const originalInput = input;
  const text = input.replace(/\s+/g, ' ').trim();
  const now = options.now ?? new Date();
  const notes: string[] = [];
  const uncertainFields: string[] = [];
  const consumed: Span[] = [];

  if (!text) {
    return emptyDraft(originalInput, options.categories);
  }

  const weddingDate = options.weddingDate ?? null;
  const date = extractDate(text, { now, weddingDate });
  if (!date && !weddingDate && /\b(?:before|by|for)\s+the\s+wedding\b/i.test(text)) {
    notes.push('Event dates are not saved yet, so no date was set. Add them in Settings.');
  }
  if (date) {
    consumed.push(date.span);
    if (date.value.note) notes.push(date.value.note);
    if (date.confidence < 0.7) uncertainFields.push('targetDate');
  }

  const priority = extractPriority(text);
  if (priority.span.end > priority.span.start) consumed.push(priority.span);

  const amount = extractAmount(text);
  if (amount) {
    consumed.push(amount.span);
    if (amount.confidence < 0.7) uncertainFields.push('estimatedExpense');
  }

  const quantity = extractQuantity(text);
  if (quantity && !overlapsAny(quantity.span, consumed)) {
    if (quantity.confidence < 0.7) uncertainFields.push('quantityValue');
  }

  const phone = extractPhone(text);
  if (phone && !overlapsAny(phone.span, consumed)) {
    consumed.push(phone.span);
  }

  const vendor = extractVendor(text);
  if (vendor) {
    uncertainFields.push('vendorName');
    notes.push(`Vendor read as "${vendor.value}". Correct it if that is wrong.`);
  }

  const category = classifyCategory(text, options.categories);
  if (category && category.confidence < 0.6) uncertainFields.push('categoryId');

  const wantsReminder = /\bremind\b|\breminder\b/i.test(text);
  const title = buildTitle(text, consumed);

  const missingFields: MissingField[] = [];
  if (!date) missingFields.push('date');
  if (!quantity) missingFields.push('quantity');
  if (!vendor) missingFields.push('vendor');
  if (!amount) missingFields.push('budget');
  if (!phone) missingFields.push('phone');

  const scores = [
    date?.confidence ?? 0.4,
    priority.confidence,
    amount?.confidence ?? 0.5,
    category?.confidence ?? 0.3,
  ];
  const confidence = Number(
    (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)
  );

  const truncated = title.length >= MAX_TITLE_LENGTH;
  if (truncated) notes.push('The title was shortened. The full sentence is kept in details.');

  return {
    title: title || text.slice(0, MAX_TITLE_LENGTH),
    originalInput,
    details: truncated || title !== text ? text : null,
    categoryId: category?.categoryId ?? null,
    categoryName: category?.categoryName ?? null,
    priority: priority.value,
    targetDate: date?.value.iso ?? null,
    reminderDate: wantsReminder ? (date?.value.iso ?? null) : null,
    vendorName: vendor?.value ?? null,
    vendorPhone: phone?.value ?? null,
    estimatedExpense: amount?.value ?? null,
    quantityValue: quantity?.value.value ?? null,
    quantityUnit: quantity?.value.unit ?? null,
    uncertainFields,
    missingFields,
    notes,
    confidence,
  };
}

const NOISE_WORDS = new Set([
  'and', 'then', 'also', 'please', 'pls', 'kindly', 'by', 'on', 'at', 'for', 'before',
  'around', 'with', 'from', 'to', 'of', 'in', 'is', 'it', 'the', 'a', 'an', 'about',
  'expected', 'estimated', 'approx', 'approximately', 'budget', 'priority', 'cost',
]);

/**
 * Rebuilds a readable title from whatever is left after the parsed values were lifted out,
 * dropping the fragments that only existed to introduce them ("expected budget", "by").
 */
function buildTitle(text: string, consumed: Span[]): string {
  const segments = removeSpans(text, consumed)
    .split(/\s*[,;]\s*/)
    .map((segment) => trimNoise(segment.replace(/\s{2,}/g, ' ').trim()))
    .filter((segment) => segment.length > 0 && !isNoiseOnly(segment));

  let title = segments.join(', ').replace(/\s+([.?!])/g, '$1').replace(/[.,;:\s]+$/g, '').trim();

  if (!title) return text.replace(/[.,;:\s]+$/g, '').slice(0, MAX_TITLE_LENGTH).trim();

  if (title.length > MAX_TITLE_LENGTH) {
    const cut = title.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = cut.lastIndexOf(' ');
    title = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function bareWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Punctuation left behind by a removed value counts as noise too. */
function isNoiseWord(word: string): boolean {
  const bare = bareWord(word);
  return bare === '' || NOISE_WORDS.has(bare);
}

function isNoiseOnly(segment: string): boolean {
  const words = segment.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every(isNoiseWord);
}

function trimNoise(segment: string): string {
  let words = segment.split(/\s+/).filter(Boolean);
  while (words.length > 0 && isNoiseWord(words[0] ?? '')) words = words.slice(1);
  while (words.length > 0 && isNoiseWord(words[words.length - 1] ?? '')) words = words.slice(0, -1);
  return words.join(' ');
}

function overlapsAny(span: Span, spans: Span[]): boolean {
  return spans.some((other) => span.start < other.end && other.start < span.end);
}

function emptyDraft(originalInput: string, categories: CategoryCandidate[]): ParsedTaskDraft {
  const fallback = categories.find((category) => category.name === 'Miscellaneous') ?? categories[0];
  return {
    title: '',
    originalInput,
    details: null,
    categoryId: fallback?.id ?? null,
    categoryName: fallback?.name ?? null,
    priority: 'Medium',
    targetDate: null,
    reminderDate: null,
    vendorName: null,
    vendorPhone: null,
    estimatedExpense: null,
    quantityValue: null,
    quantityUnit: null,
    uncertainFields: [],
    missingFields: ['date', 'quantity', 'vendor', 'budget', 'phone'],
    notes: [],
    confidence: 0,
  };
}

export const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  date: 'Add date',
  quantity: 'Add quantity',
  vendor: 'Add vendor',
  budget: 'Add budget',
  phone: 'Add phone number',
};
