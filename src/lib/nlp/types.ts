export interface Span {
  start: number;
  end: number;
  text: string;
}

export interface Extraction<T> {
  value: T;
  span: Span;
  /** 0-1. Anything below 0.7 is shown to the user as "please check this". */
  confidence: number;
}

export function makeSpan(text: string, start: number, end: number): Span {
  return { start, end, text: text.slice(start, end) };
}

/** Blanks out already-consumed text so the title builder never repeats a parsed value. */
export function removeSpans(text: string, spans: Span[]): string {
  if (spans.length === 0) return text;
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = 0;
  for (const span of ordered) {
    if (span.start < cursor) continue;
    result += text.slice(cursor, span.start);
    cursor = span.end;
  }
  result += text.slice(cursor);
  return result;
}
