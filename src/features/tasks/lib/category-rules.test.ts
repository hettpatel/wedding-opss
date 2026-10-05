import { describe, expect, it } from 'vitest';
import { nextSortOrder, validateCategoryName } from './category-rules';

const existing = [
  { id: 'a', name: 'Rituals & Puja', sortOrder: 0 },
  { id: 'b', name: 'Catering & Menu', sortOrder: 1 },
];

describe('validateCategoryName', () => {
  it('accepts a new name', () => {
    expect(validateCategoryName('Welcome Desk', existing).ok).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(validateCategoryName('   ', existing).error).toBe('Give the category a name');
  });

  it('rejects a duplicate, ignoring case and spacing', () => {
    expect(validateCategoryName('  catering & menu ', existing).ok).toBe(false);
  });

  it('allows a category to keep its own name while renaming', () => {
    expect(validateCategoryName('Catering & Menu', existing, 'b').ok).toBe(true);
  });

  it('rejects an over-long name', () => {
    expect(validateCategoryName('x'.repeat(41), existing).ok).toBe(false);
  });
});

describe('nextSortOrder', () => {
  it('continues after the highest existing order', () => {
    expect(nextSortOrder(existing)).toBe(2);
    expect(nextSortOrder([])).toBe(0);
  });
});
