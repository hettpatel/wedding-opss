import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGE_TEMPLATE } from '@/lib/message/merge';
import { buildMergeValues, renderForGuest } from './message-values';

const guest = {
  primaryGuestName: 'Rameshbhai Patel',
  invitationDisplayName: 'Mr. & Mrs. Ramesh Patel',
  village: 'Kahoda',
};

const wedding = {
  eventDates: '12 to 14 June 2026',
  venueName: 'Umiya Mataji Campus',
  mapLink: 'https://maps.example.com/kahoda',
};

describe('buildMergeValues', () => {
  it('uses the invitation name, not the stored guest name', () => {
    expect(buildMergeValues(guest, wedding).guestName).toBe('Mr. & Mrs. Ramesh Patel');
  });

  it('falls back to the guest name when there is no invitation name', () => {
    expect(buildMergeValues({ ...guest, invitationDisplayName: '' }, wedding).guestName).toBe(
      'Rameshbhai Patel'
    );
  });

  it('leaves unsaved settings empty rather than inventing them', () => {
    const values = buildMergeValues({ ...guest, village: null }, null);
    expect(values.village).toBe('');
    expect(values.eventDates).toBe('');
    expect(values.venue).toBe('');
  });
});

describe('renderForGuest', () => {
  it('fills the default message', () => {
    const message = renderForGuest(DEFAULT_MESSAGE_TEMPLATE, guest, wedding);
    expect(message).toContain('Mr. & Mrs. Ramesh Patel');
    expect(message).toContain('12 to 14 June 2026');
    expect(message).toContain('Umiya Mataji Campus');
    expect(message).not.toContain('{');
  });

  it('removes a tag whose setting is empty instead of printing the tag', () => {
    const message = renderForGuest('At {Venue} on {Event Dates}', guest, null);
    expect(message).not.toContain('{');
    expect(message.trim()).toBe('At  on');
  });
});
