'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskCategory } from '@/lib/models';
import {
  countActiveFilters,
  DEFAULT_TASK_FILTERS,
  TASK_SORTS,
  TASK_VIEWS,
  type TaskFilters as Filters,
} from '../lib/task-queries';

export function TaskFilterBar({
  filters,
  categories,
  counts,
  onChange,
}: {
  filters: Filters;
  categories: TaskCategory[];
  counts: Record<string, number>;
  onChange: (filters: Filters) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks, vendors, notes"
            className="pl-9"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
          />
        </div>
        <Button
          variant={activeCount > 0 ? 'secondary' : 'quiet'}
          size="icon"
          aria-label={`Filters${activeCount > 0 ? `, ${activeCount} active` : ''}`}
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          {TASK_VIEWS.map((view) => (
            <Chip
              key={view.id}
              active={filters.view === view.id}
              onClick={() => onChange({ ...filters, view: view.id })}
            >
              {view.label}
              {counts[view.id] ? <span className="ml-1 text-xs opacity-70">{counts[view.id]}</span> : null}
            </Chip>
          ))}
        </div>
      </div>

      {activeCount > 0 ? (
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-crimson"
          onClick={() => onChange({ ...DEFAULT_TASK_FILTERS, view: filters.view })}
        >
          <X className="h-4 w-4" aria-hidden />
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      ) : null}

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter and sort"
        footer={
          <div className="flex gap-2">
            <Button
              variant="quiet"
              size="block"
              onClick={() => onChange({ ...DEFAULT_TASK_FILTERS, view: filters.view })}
            >
              Reset
            </Button>
            <Button size="block" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Category" htmlFor="filter-category">
            <Select
              id="filter-category"
              value={filters.categoryId}
              onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="filter-priority">
            <Select
              id="filter-priority"
              value={filters.priority}
              onChange={(event) =>
                onChange({ ...filters, priority: event.target.value as Filters['priority'] })
              }
            >
              <option value="all">Any priority</option>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="filter-status">
            <Select
              id="filter-status"
              value={filters.status}
              onChange={(event) =>
                onChange({ ...filters, status: event.target.value as Filters['status'] })
              }
            >
              <option value="all">Any status</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date from" htmlFor="filter-from">
              <Input
                id="filter-from"
                type="date"
                value={filters.from ?? ''}
                onChange={(event) => onChange({ ...filters, from: event.target.value || null })}
              />
            </Field>
            <Field label="Date to" htmlFor="filter-to">
              <Input
                id="filter-to"
                type="date"
                value={filters.to ?? ''}
                onChange={(event) => onChange({ ...filters, to: event.target.value || null })}
              />
            </Field>
          </div>

          <Field label="Sort by" htmlFor="filter-sort">
            <Select
              id="filter-sort"
              value={filters.sort}
              onChange={(event) => onChange({ ...filters, sort: event.target.value as Filters['sort'] })}
            >
              {TASK_SORTS.map((sort) => (
                <option key={sort.id} value={sort.id}>
                  {sort.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
