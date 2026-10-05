'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/db/db';
import type { InvitationTemplate, MessageTemplate } from '@/lib/models';

export function useTemplates(): InvitationTemplate[] | undefined {
  return useLiveQuery(() => getDb().invitationTemplates.toArray(), []);
}

export function useActiveTemplate(): InvitationTemplate | null | undefined {
  const templates = useTemplates();
  if (templates === undefined) return undefined;
  return templates.find((template) => template.isActive) ?? templates[0] ?? null;
}

export function useMessageTemplate(): MessageTemplate | null | undefined {
  const templates = useLiveQuery(() => getDb().messageTemplates.toArray(), []);
  if (templates === undefined) return undefined;
  return templates.find((template) => template.isDefault) ?? templates[0] ?? null;
}
