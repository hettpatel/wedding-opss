'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/feedback';
import { MORE_LINKS } from '@/components/shell/more-links';

export default function MorePage() {
  return (
    <ul className="space-y-2">
      {MORE_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link href={link.href} className="app-card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-crimson/10 text-crimson">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{link.label}</span>
                  {!link.ready ? <Badge tone="gold">Not built yet</Badge> : null}
                </span>
                <span className="block text-sm text-muted">{link.description}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
