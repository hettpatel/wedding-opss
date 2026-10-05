export interface DuplicateInput {
  id?: string;
  primaryGuestName: string;
  invitationDisplayName?: string | null;
  normalizedPhone?: string | null;
  village?: string | null;
}

export type DuplicateReason = 'phone' | 'display-name' | 'name-and-village' | 'similar-name';

export interface DuplicateMatch {
  existingId: string;
  reason: DuplicateReason;
  /** 1 = certain (same phone), lower = needs a human decision. */
  confidence: number;
  explanation: string;
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(mr|mrs|ms|shri|smt|shree|dr|and|&|family|parivar)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dice coefficient over character bigrams: cheap, no dependency, good enough for name matching. */
export function nameSimilarity(a: string, b: string): number {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const bigrams = (value: string): string[] => {
    const parts: string[] = [];
    for (let i = 0; i < value.length - 1; i += 1) parts.push(value.slice(i, i + 2));
    return parts;
  };

  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  if (leftGrams.length === 0 || rightGrams.length === 0) return 0;

  const pool = new Map<string, number>();
  for (const gram of leftGrams) pool.set(gram, (pool.get(gram) ?? 0) + 1);

  let hits = 0;
  for (const gram of rightGrams) {
    const count = pool.get(gram) ?? 0;
    if (count > 0) {
      hits += 1;
      pool.set(gram, count - 1);
    }
  }
  return (2 * hits) / (leftGrams.length + rightGrams.length);
}

export function findDuplicates(
  incoming: DuplicateInput,
  existing: DuplicateInput[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const incomingVillage = normalizeName(incoming.village);

  for (const candidate of existing) {
    if (!candidate.id) continue;
    if (incoming.id && candidate.id === incoming.id) continue;

    if (incoming.normalizedPhone && candidate.normalizedPhone === incoming.normalizedPhone) {
      matches.push({
        existingId: candidate.id,
        reason: 'phone',
        confidence: 1,
        explanation: 'Same WhatsApp number as an existing guest',
      });
      continue;
    }

    const incomingDisplay = normalizeName(incoming.invitationDisplayName);
    const candidateDisplay = normalizeName(candidate.invitationDisplayName);
    if (incomingDisplay && incomingDisplay === candidateDisplay) {
      matches.push({
        existingId: candidate.id,
        reason: 'display-name',
        confidence: 0.9,
        explanation: 'Same invitation name as an existing guest',
      });
      continue;
    }

    const similarity = nameSimilarity(incoming.primaryGuestName, candidate.primaryGuestName);
    const sameVillage =
      incomingVillage.length > 0 && incomingVillage === normalizeName(candidate.village);

    if (similarity >= 0.82 && sameVillage) {
      matches.push({
        existingId: candidate.id,
        reason: 'name-and-village',
        confidence: 0.85,
        explanation: 'Very similar name in the same village',
      });
      continue;
    }
    if (similarity >= 0.9) {
      matches.push({
        existingId: candidate.id,
        reason: 'similar-name',
        confidence: 0.6,
        explanation: 'Very similar guest name',
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}
