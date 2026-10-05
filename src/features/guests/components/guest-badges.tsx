import { Badge } from '@/components/ui/feedback';
import type { GuestSide, InvitationStatus } from '@/lib/models';

const STATUS_TONE: Record<InvitationStatus, 'neutral' | 'crimson' | 'gold' | 'success' | 'warning' | 'error'> = {
  Pending: 'neutral',
  'Invitation Generated': 'crimson',
  'Share Sheet Opened': 'gold',
  'WhatsApp Opened': 'gold',
  'Sent Confirmed Manually': 'success',
  Failed: 'error',
  'Needs Review': 'warning',
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

export function SideBadge({ side }: { side: GuestSide }) {
  return <Badge tone="neutral">{side}</Badge>;
}
