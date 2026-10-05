'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { GUEST_SIDES, INVITATION_STATUSES } from '@/lib/models';
import {
  countActiveGuestFilters,
  DEFAULT_GUEST_FILTERS,
  GUEST_SORTS,
  type GuestFilters as Filters,
} from '../lib/guest-queries';

export function GuestFilterBar({
  filters,
  counts,
  onChange,
}: {
  filters: Filters;
  counts: { all: number; needsReview: number; noPhone: number };
  onChange: (filters: Filters) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = countActiveGuestFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            aria-label="Search guests"
            placeholder="Search name, village or number"
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
          <Chip
            active={filters.side === 'all' && filters.status === 'all' && !filters.needsReviewOnly}
            onClick={() => onChange({ ...filters, side: 'all', status: 'all', needsReviewOnly: false })}
          >
            Everyone <span className="ml-1 text-xs opacity-70">{counts.all}</span>
          </Chip>
          {GUEST_SIDES.map((side) => (
            <Chip
              key={side}
              active={filters.side === side}
              onClick={() => onChange({ ...filters, side: filters.side === side ? 'all' : side })}
            >
              {side}
            </Chip>
          ))}
          <Chip
            active={filters.needsReviewOnly}
            onClick={() => onChange({ ...filters, needsReviewOnly: !filters.needsReviewOnly })}
          >
            Needs review <span className="ml-1 text-xs opacity-70">{counts.needsReview}</span>
          </Chip>
        </div>
      </div>

      {activeCount > 0 ? (
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-crimson"
          onClick={() => onChange({ ...DEFAULT_GUEST_FILTERS, sort: filters.sort })}
        >
          <X className="h-4 w-4" aria-hidden />
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      ) : null}

      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter and sort guests"
        footer={
          <div className="flex gap-2">
            <Button
              variant="quiet"
              size="block"
              onClick={() => onChange({ ...DEFAULT_GUEST_FILTERS, sort: filters.sort })}
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
          <Field label="Side" htmlFor="guest-filter-side">
            <Select
              id="guest-filter-side"
              value={filters.side}
              onChange={(event) => onChange({ ...filters, side: event.target.value as Filters['side'] })}
            >
              <option value="all">Any side</option>
              {GUEST_SIDES.map((side) => (
                <option key={side} value={side}>
                  {side}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Invitation status" htmlFor="guest-filter-status">
            <Select
              id="guest-filter-status"
              value={filters.status}
              onChange={(event) => onChange({ ...filters, status: event.target.value as Filters['status'] })}
            >
              <option value="all">Any status</option>
              {INVITATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex min-h-touch items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#800020]"
              checked={filters.needsReviewOnly}
              onChange={(event) => onChange({ ...filters, needsReviewOnly: event.target.checked })}
            />
            Only guests that need a check ({counts.needsReview})
          </label>

          <Field label="Sort by" htmlFor="guest-filter-sort">
            <Select
              id="guest-filter-sort"
              value={filters.sort}
              onChange={(event) => onChange({ ...filters, sort: event.target.value as Filters['sort'] })}
            >
              {GUEST_SORTS.map((sort) => (
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
