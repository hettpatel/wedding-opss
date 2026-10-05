import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from '../db/default-categories';
import { parseTaskInput } from './parse-task-input';

const categories = DEFAULT_CATEGORIES.map((category) => ({
  id: category.name,
  name: category.name,
  keywords: category.keywords,
}));

// Wednesday 10 June 2026, so weekday maths is predictable.
const now = new Date(2026, 5, 10);
const parse = (input: string) => parseTaskInput(input, { now, categories });

describe('parseTaskInput', () => {
  it('handles the full example sentence', () => {
    const draft = parse(
      'Get quotation from Mahesh decorator for stage and mandap by next Sunday, high priority, expected budget 75000.'
    );
    expect(draft.categoryName).toBe('Venue & Decor');
    expect(draft.priority).toBe('High');
    expect(draft.estimatedExpense).toBe(75000);
    expect(draft.targetDate).toBe('2026-06-14');
    expect(draft.vendorName).toBe('Mahesh decorator');
    expect(draft.title).toBe('Get quotation from Mahesh decorator for stage and mandap');
    expect(draft.originalInput).toContain('75000');
  });

  it('reads relative dates', () => {
    expect(parse('Collect sweets today').targetDate).toBe('2026-06-10');
    expect(parse('Collect sweets tomorrow').targetDate).toBe('2026-06-11');
    expect(parse('Collect sweets day after tomorrow').targetDate).toBe('2026-06-12');
    expect(parse('Pay caterer next week').targetDate).toBe('2026-06-17');
    expect(parse('Pay caterer this Sunday').targetDate).toBe('2026-06-14');
    expect(parse('Pay caterer in 3 days').targetDate).toBe('2026-06-13');
    expect(parse('Pay caterer on 20/06/2026').targetDate).toBe('2026-06-20');
    expect(parse('Pay caterer on 5 July 2026').targetDate).toBe('2026-07-05');
  });

  it('never invents a date', () => {
    const draft = parse('Finalise the menu with the caterer');
    expect(draft.targetDate).toBeNull();
    expect(draft.missingFields).toContain('date');
  });

  it('only marks High priority when urgency is stated', () => {
    expect(parse('Book photographer').priority).toBe('Medium');
    expect(parse('Book photographer urgently').priority).toBe('High');
    expect(parse('Book photographer, important').priority).toBe('High');
    expect(parse('Book photographer, low priority').priority).toBe('Low');
    expect(parse('Book photographer, not urgent').priority).toBe('Low');
  });

  it('classifies categories from keywords', () => {
    expect(parse('Order 50 kg sweets for dinner').categoryName).toBe('Catering & Menu');
    expect(parse('Arrange 3 buses for the baraat').categoryName).toBe('Transport & Vehicles');
    expect(parse('Book pandit for Ganesh puja').categoryName).toBe('Rituals & Puja');
    expect(parse('Book 20 rooms for outstation guests').categoryName).toBe('Guest Accommodation');
    expect(parse('Pack mameru gift boxes').categoryName).toBe('Mameru Gifts');
    expect(parse('Send WhatsApp invitation to guests').categoryName).toBe(
      'Invitations & Communication'
    );
    expect(parse('Pay advance to the photographer').categoryName).toBe('Photography & Media');
    expect(parse('Buy a torch').categoryName).toBe('Miscellaneous');
  });

  it('reads amounts only when they are written as money', () => {
    expect(parse('Pay decorator ₹75,000').estimatedExpense).toBe(75000);
    expect(parse('Pay decorator 75k').estimatedExpense).toBe(75000);
    expect(parse('Pay decorator Rs 1.5 lakh').estimatedExpense).toBe(150000);
    expect(parse('Order 50 kg sweets').estimatedExpense).toBeNull();
    expect(parse('Arrange 3 buses').estimatedExpense).toBeNull();
  });

  it('reads quantities with their unit', () => {
    const sweets = parse('Order 50 kg sweets');
    expect(sweets.quantityValue).toBe(50);
    expect(sweets.quantityUnit).toBe('kg');

    const boxes = parse('Pack 200 boxes for mameru');
    expect(boxes.quantityValue).toBe(200);
    expect(boxes.quantityUnit).toBe('boxes');

    const buses = parse('Arrange 3 buses');
    expect(buses.quantityValue).toBe(3);
    expect(buses.quantityUnit).toBe('buses');
  });

  it('picks up an Indian phone number without treating it as money', () => {
    const draft = parse('Call Mahesh decorator 9876543210 for the stage');
    expect(draft.vendorPhone).toBe('9876543210');
    expect(draft.estimatedExpense).toBeNull();
    expect(draft.title).not.toContain('9876543210');
  });

  it('keeps the whole sentence when nothing can be parsed', () => {
    const sentence = 'Kaka ne puchhvanu chhe';
    const draft = parse(sentence);
    expect(draft.title).toBe(sentence);
    expect(draft.originalInput).toBe(sentence);
  });

  it('keeps a very long sentence in the details instead of losing it', () => {
    const long =
      'Speak to the caterer about breakfast lunch and dinner arrangements for all three days including the staff meals and the extra counters near the main gate';
    const draft = parse(long);
    expect(draft.title.length).toBeLessThanOrEqual(90);
    expect(draft.details).toBe(long);
    expect(draft.originalInput).toBe(long);
  });

  it('lists what is missing so the form can offer optional chips', () => {
    const draft = parse('Finalise the menu');
    expect(draft.missingFields).toEqual(['date', 'quantity', 'vendor', 'budget', 'phone']);
  });

  it('anchors "before the wedding" to the saved event date', () => {
    const draft = parseTaskInput('Finish the mameru packing before the wedding', {
      now,
      categories,
      weddingDate: '2026-06-20',
    });
    expect(draft.targetDate).toBe('2026-06-20');
    expect(draft.notes.length).toBeGreaterThan(0);
  });

  it('adds no date for "before the wedding" when event dates are not saved', () => {
    const draft = parse('Finish the mameru packing before the wedding');
    expect(draft.targetDate).toBeNull();
    expect(draft.notes.join(' ')).toContain('Settings');
  });

  it('sets a reminder only when a reminder is asked for', () => {
    expect(parse('Pay the caterer tomorrow').reminderDate).toBeNull();
    expect(parse('Remind me to pay the caterer tomorrow').reminderDate).toBe('2026-06-11');
  });

  it('reads Indian phone numbers in their usual written forms', () => {
    expect(parse('Call decorator +91 98765 43210').vendorPhone).toBe('+91 98765 43210');
    expect(parse('Call decorator 098765-43210').vendorPhone).toBe('098765-43210');
  });

  it('uses custom categories too', () => {
    const custom = [...categories, { id: 'welcome', name: 'Welcome Desk', keywords: ['welcome', 'desk'] }];
    const draft = parseTaskInput('Arrange the welcome desk banner', { now, categories: custom });
    expect(draft.categoryName).toBe('Welcome Desk');
  });

  it('treats "normal priority" as Medium', () => {
    expect(parse('Order chairs, normal priority').priority).toBe('Medium');
  });

  it('returns an empty draft for empty input without throwing', () => {
    const draft = parse('   ');
    expect(draft.title).toBe('');
    expect(draft.confidence).toBe(0);
  });
});
