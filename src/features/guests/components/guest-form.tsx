'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { InlineNotice } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { useToast } from '@/components/ui/toast';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/format/phone';
import { findDuplicates } from '@/lib/guests/duplicates';
import { GUEST_SIDES, INVITATION_STATUSES, type GuestHousehold } from '@/lib/models';
import { ContactPickerButton } from './contact-picker-button';
import {
  EMPTY_GUEST_FORM,
  formValuesToGuest,
  guestFormSchema,
  guestToFormValues,
  type GuestFormValues,
} from '../lib/guest-form-schema';
import { deleteGuest, saveGuest } from '../lib/guest-service';

export function GuestForm({
  open,
  guest,
  allGuests,
  defaultCountryCode,
  onClose,
}: {
  open: boolean;
  /** Null means a new guest. */
  guest: GuestHousehold | null;
  allGuests: GuestHousehold[];
  defaultCountryCode: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initialValues = useMemo<GuestFormValues>(
    () => (guest ? guestToFormValues(guest) : EMPTY_GUEST_FORM),
    [guest]
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      reset(initialValues);
      setSaveError(null);
    }
  }, [initialValues, open, reset]);

  const phoneValue = watch('rawPhone');
  const nameValue = watch('primaryGuestName');
  const villageValue = watch('village');

  const phoneHint = useMemo(() => {
    if (!phoneValue?.trim()) return undefined;
    const parsed = normalizePhone(phoneValue, defaultCountryCode);
    return parsed.status === 'ok'
      ? `Will be used as ${formatPhoneForDisplay(parsed)}`
      : `${parsed.message ?? 'Check this number.'} The guest is still saved and marked for a check.`;
  }, [defaultCountryCode, phoneValue]);

  // Warn about a likely duplicate while typing. It never blocks saving.
  const duplicateWarning = useMemo(() => {
    if (!nameValue?.trim()) return null;
    const parsed = normalizePhone(phoneValue ?? '', defaultCountryCode);
    const matches = findDuplicates(
      {
        id: guest?.id,
        primaryGuestName: nameValue,
        normalizedPhone: parsed.normalized,
        village: villageValue,
      },
      allGuests.map((item) => ({
        id: item.id,
        primaryGuestName: item.primaryGuestName,
        invitationDisplayName: item.invitationDisplayName,
        normalizedPhone: item.normalizedPhone,
        village: item.village,
      }))
    );
    const best = matches[0];
    if (!best) return null;
    const existing = allGuests.find((item) => item.id === best.existingId);
    return `${best.explanation}: ${existing?.primaryGuestName ?? 'an existing guest'}. Save only if this is a different household.`;
  }, [allGuests, defaultCountryCode, guest?.id, nameValue, phoneValue, villageValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const record = formValuesToGuest(values, {
        existing: guest ?? undefined,
        defaultCountryCode,
      });
      await saveGuest(record);
      showToast({
        message: guest ? 'Guest updated and saved on this phone' : 'Guest saved on this phone',
        tone: 'success',
      });
      onClose();
    } catch {
      setSaveError('The guest could not be saved. Nothing you typed was lost - try again.');
    }
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={guest ? 'Edit guest' : 'Add a guest household'}
        footer={
          <div className="flex gap-2">
            <Button variant="quiet" size="block" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="block" pending={isSubmitting} onClick={() => void onSubmit()}>
              {guest ? 'Save changes' : 'Save guest'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)} noValidate>
          {saveError ? <InlineNotice tone="error">{saveError}</InlineNotice> : null}

          {!guest ? (
            <ContactPickerButton
              onPicked={(contact) => {
                if (contact.name) setValue('primaryGuestName', contact.name, { shouldValidate: true });
                if (contact.phone) setValue('rawPhone', contact.phone, { shouldValidate: true });
              }}
            />
          ) : null}

          {duplicateWarning ? <InlineNotice tone="warning">{duplicateWarning}</InlineNotice> : null}

          <Field label="Guest name" htmlFor="guest-name" error={errors.primaryGuestName?.message}>
            <Input id="guest-name" {...register('primaryGuestName')} />
          </Field>

          <Field
            label="Name to print on the card"
            htmlFor="guest-display"
            error={errors.invitationDisplayName?.message}
            hint="Leave empty to use the guest name"
          >
            <Input
              id="guest-display"
              placeholder="Mr. & Mrs. Ramesh Patel"
              {...register('invitationDisplayName')}
            />
          </Field>

          <Field label="WhatsApp number" htmlFor="guest-phone" error={errors.rawPhone?.message} hint={phoneHint}>
            <Input id="guest-phone" type="tel" inputMode="tel" {...register('rawPhone')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Village or city" htmlFor="guest-village" error={errors.village?.message}>
              <Input id="guest-village" {...register('village')} />
            </Field>

            <Field label="Side" htmlFor="guest-side" error={errors.side?.message}>
              <Select id="guest-side" {...register('side')}>
                {GUEST_SIDES.map((side) => (
                  <option key={side} value={side}>
                    {side}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Number of guests expected"
              htmlFor="guest-count"
              error={errors.expectedGuestCount?.message}
            >
              <Input id="guest-count" inputMode="numeric" {...register('expectedGuestCount')} />
            </Field>

            <Field label="Invitation status" htmlFor="guest-status" error={errors.invitationStatus?.message}>
              <Select id="guest-status" {...register('invitationStatus')}>
                {INVITATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="guest-notes" error={errors.notes?.message}>
            <Textarea id="guest-notes" rows={2} {...register('notes')} />
          </Field>

          <label className="flex min-h-touch items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#800020]" {...register('needsReview')} />
            Mark this guest for a check later
          </label>

          {guest ? (
            <Button variant="ghost" size="block" onClick={() => setConfirmDelete(true)}>
              Delete this guest
            </Button>
          ) : null}
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this guest?"
        description={`${guest?.primaryGuestName ?? 'This guest'} will be removed from this phone. This cannot be undone.`}
        confirmLabel="Delete guest"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (guest) await deleteGuest(guest.id);
          setConfirmDelete(false);
          showToast({ message: 'Guest deleted' });
          onClose();
        }}
      />
    </>
  );
}
