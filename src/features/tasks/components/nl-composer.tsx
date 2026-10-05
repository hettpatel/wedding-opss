'use client';

import { Mic, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, Chip } from '@/components/ui/feedback';
import { Textarea } from '@/components/ui/form-controls';
import { formatInr } from '@/lib/format/currency';
import { formatDisplayDate } from '@/lib/format/date';
import type { TaskCategory } from '@/lib/models';
import {
  MISSING_FIELD_LABELS,
  parseTaskInput,
  type ParsedTaskDraft,
} from '@/lib/nlp/parse-task-input';
import { EMPTY_TASK_FORM, type TaskFormValues } from '../lib/task-form-schema';

const DRAFT_KEY = 'wedding-ops:task-draft';

function readDraft(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

function writeDraft(value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, value);
  } catch {
    // Drafts are a convenience; losing them must never break the screen.
  }
}

export function draftToFormValues(draft: ParsedTaskDraft, fallbackCategoryId: string): TaskFormValues {
  return {
    ...EMPTY_TASK_FORM,
    title: draft.title,
    categoryId: draft.categoryId ?? fallbackCategoryId,
    priority: draft.priority,
    status: 'Open',
    targetDate: draft.targetDate ?? '',
    reminderDate: draft.reminderDate ?? '',
    details: draft.details ?? '',
    vendorName: draft.vendorName ?? '',
    vendorPhone: draft.vendorPhone ?? '',
    estimatedExpense: draft.estimatedExpense === null ? '' : String(draft.estimatedExpense),
    quantityValue: draft.quantityValue === null ? '' : String(draft.quantityValue),
    quantityUnit: draft.quantityUnit ?? '',
  };
}

export function NaturalLanguageComposer({
  categories,
  weddingDate = null,
  onReview,
}: {
  categories: TaskCategory[];
  /** Lets phrases like "before the wedding" resolve to a real date. */
  weddingDate?: string | null;
  onReview: (draft: ParsedTaskDraft) => void;
}) {
  const [text, setText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Keeps a half-written sentence if the browser closes or the app is swiped away.
  // Private browsing can refuse local storage entirely, so every call is guarded.
  useEffect(() => {
    const saved = readDraft();
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => writeDraft(text), 400);
    return () => window.clearTimeout(timer);
  }, [text]);

  const candidates = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name, keywords: category.keywords })),
    [categories]
  );

  const draft = useMemo(
    () => (text.trim() ? parseTaskInput(text, { categories: candidates, weddingDate }) : null),
    [candidates, text, weddingDate]
  );

  const clear = () => {
    setText('');
    setShowPreview(false);
    writeDraft(null);
  };

  return (
    <Card className="space-y-3 p-4">
      <div>
        <label htmlFor="nl-input" className="block text-sm font-medium">
          Describe what needs to be done
        </label>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <Mic className="h-3.5 w-3.5" aria-hidden />
          Type, or use the microphone on your keyboard to speak.
        </p>
      </div>

      <Textarea
        id="nl-input"
        rows={3}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setShowPreview(false);
        }}
        placeholder="Get quotation from Mahesh decorator for stage and mandap by next Sunday, high priority, expected budget 75000"
      />

      {showPreview && draft ? (
        <DraftPreview
          draft={draft}
          onEdit={() => {
            onReview(draft);
            clear();
          }}
          onBack={() => setShowPreview(false)}
        />
      ) : (
        <div className="flex gap-2">
          {text.trim() ? (
            <Button variant="quiet" size="md" onClick={clear}>
              Clear
            </Button>
          ) : null}
          <Button
            size="block"
            disabled={!text.trim()}
            onClick={() => setShowPreview(true)}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Read my sentence
          </Button>
        </div>
      )}
    </Card>
  );
}

function DraftPreview({
  draft,
  onEdit,
  onBack,
}: {
  draft: ParsedTaskDraft;
  onEdit: () => void;
  onBack: () => void;
}) {
  const rows: Array<[string, string, boolean]> = [
    ['Task', draft.title || '—', false],
    ['Category', draft.categoryName ?? '—', draft.uncertainFields.includes('categoryId')],
    ['Priority', draft.priority, false],
    ['Date', draft.targetDate ? formatDisplayDate(draft.targetDate) : 'Not mentioned', draft.uncertainFields.includes('targetDate')],
    ['Vendor', draft.vendorName ?? 'Not mentioned', draft.uncertainFields.includes('vendorName')],
    ['Phone', draft.vendorPhone ?? 'Not mentioned', false],
    [
      'Budget',
      draft.estimatedExpense === null ? 'Not mentioned' : formatInr(draft.estimatedExpense),
      draft.uncertainFields.includes('estimatedExpense'),
    ],
    [
      'Quantity',
      draft.quantityValue === null ? 'Not mentioned' : `${draft.quantityValue} ${draft.quantityUnit ?? ''}`.trim(),
      false,
    ],
  ];

  return (
    <div className="space-y-3 rounded-lg border border-gold/60 bg-gold/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">This is what was understood</p>
        <Badge tone={draft.confidence >= 0.7 ? 'success' : 'warning'}>
          {draft.confidence >= 0.7 ? 'Confident' : 'Please check'}
        </Badge>
      </div>

      <dl className="divide-y divide-hairline text-sm">
        {rows.map(([label, value, uncertain]) => (
          <div key={label} className="flex gap-3 py-1.5">
            <dt className="w-24 shrink-0 text-muted">{label}</dt>
            <dd className={uncertain ? 'font-medium text-warning' : ''}>
              {value}
              {uncertain ? <span className="ml-1 text-xs">(check this)</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      {draft.notes.length > 0 ? (
        <ul className="space-y-1 text-xs text-warning">
          {draft.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {draft.missingFields.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {draft.missingFields.map((field) => (
            <Chip key={field} onClick={onEdit}>
              {MISSING_FIELD_LABELS[field]}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button variant="quiet" onClick={onBack}>
          Change words
        </Button>
        <Button size="block" onClick={onEdit}>
          Correct and save
        </Button>
      </div>
    </div>
  );
}
