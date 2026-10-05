'use client';

import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface PickedContact {
  name?: string[];
  tel?: string[];
}

interface ContactsManagerLike {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<PickedContact[]>;
}

function getContactPicker(): ContactsManagerLike | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  const candidate = (navigator as Navigator & { contacts?: ContactsManagerLike }).contacts;
  if (!candidate || typeof candidate.select !== 'function') return null;
  if (!('ContactsManager' in window)) return null;
  return candidate;
}

/**
 * Optional extra. The button only appears on browsers that actually have the Contact
 * Picker; everywhere else the manual fields and the import are the way in.
 */
export function ContactPickerButton({
  onPicked,
}: {
  onPicked: (contact: { name: string; phone: string }) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(getContactPicker() !== null);
  }, []);

  if (!supported) return null;

  return (
    <div className="space-y-1">
      <Button
        variant="quiet"
        size="block"
        pending={busy}
        onClick={async () => {
          const picker = getContactPicker();
          if (!picker) return;
          setBusy(true);
          setMessage(null);
          try {
            const results = await picker.select(['name', 'tel'], { multiple: false });
            const first = results[0];
            if (!first) {
              setBusy(false);
              return;
            }
            onPicked({ name: first.name?.[0] ?? '', phone: first.tel?.[0] ?? '' });
          } catch {
            setMessage('The contact list could not be opened. Type the details instead.');
          }
          setBusy(false);
        }}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Choose from contacts
      </Button>
      {message ? <p className="text-xs text-warning">{message}</p> : null}
    </div>
  );
}
