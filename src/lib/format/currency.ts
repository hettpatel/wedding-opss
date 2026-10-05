const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return inrFormatter.format(Math.round(value));
}

export const AMOUNT_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  hajar: 1_000,
  hazar: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  l: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
  cr: 10_000_000,
};

/**
 * Parses amounts a person would actually type: "75000", "75,000", "Rs 75000",
 * "₹75,000", "75k", "1.5 lakh", "2cr". Returns null when nothing numeric is present.
 */
export function parseInrAmount(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input
    .toLowerCase()
    .replace(/[₹]/g, ' ')
    .replace(/\brs\.?\b|\binr\b|\brupees?\b/g, ' ')
    .trim();

  const match = cleaned.match(
    /(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|hajar|hazar|lakhs?|lacs?|l|crores?|cr)?\b/
  );
  if (!match || !match[1]) return null;

  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;

  const unit = match[2];
  const multiplier = unit ? (AMOUNT_MULTIPLIERS[unit] ?? 1) : 1;
  const value = base * multiplier;
  return Number.isFinite(value) ? Math.round(value) : null;
}
