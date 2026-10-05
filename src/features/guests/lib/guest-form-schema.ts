import { z } from 'zod';
import { normalizePhone } from '@/lib/format/phone';
import { GUEST_SIDES, INVITATION_STATUSES } from '@/lib/models';
import type { GuestFormValues } from './guest-mapping';

export * from './guest-mapping';

export const guestFormSchema = z.object({
  primaryGuestName: z.string().trim().min(1, 'Add the guest name'),
  invitationDisplayName: z.string().trim().max(120, 'Keep this short enough to print'),
  // A bad number is a warning shown next to the field, never a reason to block saving.
  rawPhone: z.string().trim().refine((value) => {
    if (value === '') return true;
    return normalizePhone(value).status !== 'contains-text' || value.length < 60;
  }, 'This number is too long to be a phone number'),
  village: z.string().trim().max(80, 'Keep this short'),
  side: z.enum(GUEST_SIDES),
  expectedGuestCount: z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true;
      const count = Number(value);
      return Number.isInteger(count) && count >= 0 && count <= 999;
    }, 'Enter a whole number, for example 4'),
  notes: z.string().trim(),
  invitationStatus: z.enum(INVITATION_STATUSES),
  needsReview: z.boolean(),
});

type SchemaValues = z.infer<typeof guestFormSchema>;
type Assert<T extends true> = T;

/** Fails the build if the schema and the hand-written form type drift apart. */
type _SchemaMatchesFormValues = Assert<
  SchemaValues extends GuestFormValues ? (GuestFormValues extends SchemaValues ? true : false) : false
>;
