'use client';

import { Cloud, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

export function OnlineBadge({ className }: { className?: string }) {
  const online = useOnlineStatus();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        online ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
        className
      )}
      role="status"
    >
      {online ? <Cloud className="h-3.5 w-3.5" aria-hidden /> : <CloudOff className="h-3.5 w-3.5" aria-hidden />}
      {online ? 'Online' : 'Offline - still working'}
    </span>
  );
}
