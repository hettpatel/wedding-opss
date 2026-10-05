export type PhoneStatus =
  | 'ok'
  | 'missing'
  | 'invalid'
  | 'landline'
  | 'multiple'
  | 'contains-text';

export interface NormalizedPhone {
  /** Exactly what was imported or typed, never discarded. */
  raw: string;
  /** E.164-style value without the plus, e.g. "919876543210". Null when unusable. */
  normalized: string | null;
  countryCode: string | null;
  nationalNumber: string | null;
  status: PhoneStatus;
  /** Plain-English explanation shown next to the guest. */
  message: string | null;
}

const SEPARATORS = /[\/,;]|\s{2,}|\bor\b|&/i;

function result(partial: Partial<NormalizedPhone> & { raw: string; status: PhoneStatus }): NormalizedPhone {
  return {
    normalized: null,
    countryCode: null,
    nationalNumber: null,
    message: null,
    ...partial,
  };
}

/**
 * Normalizes a phone number for WhatsApp links. The default country is configurable
 * (India is only the default, never hardcoded into the logic).
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountryCode = '91'
): NormalizedPhone {
  const original = (raw ?? '').toString();
  const trimmed = original.trim();

  if (!trimmed) {
    return result({ raw: original, status: 'missing', message: 'No phone number' });
  }

  if (/[a-z]/i.test(trimmed.replace(/\b(ext|or)\b/gi, ''))) {
    return result({
      raw: original,
      status: 'contains-text',
      message: 'This number contains letters. Check it before sending.',
    });
  }

  const parts = trimmed.split(SEPARATORS).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return result({
      raw: original,
      status: 'multiple',
      message: 'More than one number found. Pick one before sending.',
    });
  }

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (!digits) {
    return result({ raw: original, status: 'invalid', message: 'No digits in this number' });
  }

  const cc = defaultCountryCode.replace(/\D/g, '') || '91';

  // India-shaped inputs: 0XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX.
  if (cc === '91' && !hasPlus) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  } else if (digits.startsWith(cc) && digits.length > 10) {
    digits = digits.slice(cc.length);
  }

  if (hasPlus && digits.length > 10) {
    // Already international: keep the country code that was supplied.
    const international = digits;
    if (international.length < 8 || international.length > 15) {
      return result({ raw: original, status: 'invalid', message: 'This number length looks wrong' });
    }
    const guessedCc = international.startsWith(cc) ? cc : international.slice(0, international.length - 10);
    return result({
      raw: original,
      status: 'ok',
      normalized: international,
      countryCode: guessedCc,
      nationalNumber: international.slice(guessedCc.length),
    });
  }

  if (cc === '91') {
    if (digits.length !== 10) {
      if (digits.length >= 8 && digits.length <= 11 && /^0?[2-5]/.test(digits)) {
        return result({
          raw: original,
          status: 'landline',
          message: 'This looks like a landline. WhatsApp will not work.',
        });
      }
      return result({
        raw: original,
        status: 'invalid',
        message: `Indian mobile numbers have 10 digits. This one has ${digits.length}.`,
      });
    }
    if (!/^[6-9]/.test(digits)) {
      return result({
        raw: original,
        status: 'landline',
        message: 'This looks like a landline. WhatsApp will not work.',
      });
    }
  }

  if (digits.length < 6 || digits.length > 15) {
    return result({ raw: original, status: 'invalid', message: 'This number length looks wrong' });
  }

  return result({
    raw: original,
    status: 'ok',
    normalized: `${cc}${digits}`,
    countryCode: cc,
    nationalNumber: digits,
  });
}

export function formatPhoneForDisplay(phone: NormalizedPhone): string {
  if (phone.normalized && phone.countryCode && phone.nationalNumber) {
    return `+${phone.countryCode} ${phone.nationalNumber}`;
  }
  return phone.raw || '—';
}

export function buildWhatsAppLink(normalized: string, message: string): string {
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
