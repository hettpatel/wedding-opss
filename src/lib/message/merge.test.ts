import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MESSAGE_TEMPLATE,
  findEmptyTagValues,
  findUnknownTags,
  renderMessage,
} from './merge';

const values = {
  guestName: 'Ramesh Patel',
  village: 'Kahoda',
  eventDates: '12-14 June 2026',
  venue: 'Umiya Mataji Campus',
  mapLink: 'https://maps.example.com/kahoda',
};

describe('merge tags', () => {
  it('fills every known tag', () => {
    const output = renderMessage(DEFAULT_MESSAGE_TEMPLATE, values);
    expect(output).toContain('Ramesh Patel');
    expect(output).toContain('12-14 June 2026');
    expect(output).toContain('Umiya Mataji Campus');
    expect(output).not.toContain('{');
  });

  it('is tolerant of spacing and case inside the braces', () => {
    expect(renderMessage('Hi {  guest name }', values)).toBe('Hi Ramesh Patel');
  });

  it('leaves unknown tags visible so nothing disappears quietly', () => {
    const template = 'Hello {Guest Name}, see {Gift List}';
    expect(renderMessage(template, values)).toBe('Hello Ramesh Patel, see {Gift List}');
    expect(findUnknownTags(template)).toEqual(['{Gift List}']);
  });

  it('reports tags whose settings are still empty', () => {
    const empty = { ...values, venue: '' };
    expect(findEmptyTagValues('At {Venue} on {Event Dates}', empty)).toEqual(['{Venue}']);
  });
});
