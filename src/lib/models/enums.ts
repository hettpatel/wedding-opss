/** Shared literal sets, kept free of Zod so pure logic and its tests can use them. */
export const GUEST_SIDES = ['Groom', 'Bride', 'Common'] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const INVITATION_STATUSES = [
  'Pending',
  'Invitation Generated',
  'Share Sheet Opened',
  'WhatsApp Opened',
  'Sent Confirmed Manually',
  'Failed',
  'Needs Review',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** The only status that means a person confirmed the invitation actually went out. */
export const CONFIRMED_SENT_STATUS: InvitationStatus = 'Sent Confirmed Manually';

export const DISPATCH_METHODS = ['native-share', 'whatsapp-link', 'manual-download'] as const;
