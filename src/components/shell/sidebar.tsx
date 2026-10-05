'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isActivePath, PRIMARY_NAV } from './nav-items';
import { MORE_LINKS } from './more-links';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-hairline bg-white md:block">
      <div className="sticky top-0 flex h-screen flex-col gap-6 px-3 py-5">
        <div className="px-2">
          <p className="font-serif text-lg leading-tight">Wedding Ops</p>
          <p className="text-xs text-muted">Kahoda, Mehsana</p>
        </div>

        <nav aria-label="Main" className="space-y-1">
          {PRIMARY_NAV.filter((item) => item.href !== '/more').map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-touch items-center gap-3 rounded-lg px-3 text-sm font-medium',
                  active ? 'bg-crimson text-white' : 'text-ink hover:bg-surface'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Other sections" className="space-y-1 border-t border-hairline pt-4">
          {MORE_LINKS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-touch items-center gap-3 rounded-lg px-3 text-sm',
                  active ? 'bg-crimson/10 font-medium text-crimson' : 'text-muted hover:bg-surface'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
