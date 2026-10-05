import type { TaskPriority } from '../models/task';
import { makeSpan, type Extraction } from './types';

const HIGH_PRIORITY = /\b(urgent|urgently|asap|immediately|right away|high priority|top priority|critical|emergency|important|must do today|turant|jaldi)\b/i;
const LOW_PRIORITY = /\b(low priority|no hurry|not urgent|whenever|if possible|can wait|later)\b/i;
const MEDIUM_PRIORITY = /\b(normal priority|medium priority|regular priority)\b/i;

/**
 * High priority is only assigned when the person says so. Everything else defaults to
 * Medium, which the preview shows and the person can change.
 */
export function extractPriority(text: string): Extraction<TaskPriority> {
  const low = text.match(LOW_PRIORITY);
  if (low && low.index !== undefined) {
    return {
      value: 'Low',
      span: makeSpan(text, low.index, low.index + low[0].length),
      confidence: 0.9,
    };
  }

  const medium = text.match(MEDIUM_PRIORITY);
  if (medium && medium.index !== undefined) {
    return {
      value: 'Medium',
      span: makeSpan(text, medium.index, medium.index + medium[0].length),
      confidence: 0.9,
    };
  }

  const high = text.match(HIGH_PRIORITY);
  if (high && high.index !== undefined) {
    return {
      value: 'High',
      span: makeSpan(text, high.index, high.index + high[0].length),
      confidence: 0.9,
    };
  }

  return { value: 'Medium', span: makeSpan(text, 0, 0), confidence: 0.3 };
}

export interface CategoryCandidate {
  id: string;
  name: string;
  keywords: string[];
}

export interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Keyword scoring against the categories actually stored in the database, so custom
 * categories take part too. Longer keyword matches score higher than single words.
 */
export function classifyCategory(
  text: string,
  categories: CategoryCandidate[],
  fallbackName = 'Miscellaneous'
): CategoryMatch | null {
  if (categories.length === 0) return null;
  const lower = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;

  let best: CategoryMatch | null = null;

  for (const category of categories) {
    const matched: string[] = [];
    let score = 0;

    const terms = new Set<string>([
      ...category.keywords.map((keyword) => keyword.toLowerCase()),
      ...category.name
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length > 3 && word !== 'and'),
    ]);

    for (const term of terms) {
      if (!term) continue;
      if (lower.includes(` ${term} `) || lower.includes(` ${term}s `)) {
        matched.push(term);
        score += term.includes(' ') ? 3 : term.length > 5 ? 2 : 1.5;
      }
    }

    if (score > 0 && (!best || score > best.confidence * 10)) {
      best = {
        categoryId: category.id,
        categoryName: category.name,
        confidence: Math.min(0.95, 0.45 + score / 10),
        matchedKeywords: matched,
      };
    }
  }

  if (best) return best;

  const fallback =
    categories.find((category) => category.name === fallbackName) ?? categories[categories.length - 1];
  if (!fallback) return null;

  return {
    categoryId: fallback.id,
    categoryName: fallback.name,
    confidence: 0.2,
    matchedKeywords: [],
  };
}
