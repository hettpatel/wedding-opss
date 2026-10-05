'use client';

import { usePathname } from 'next/navigation';
import { OnlineBadge } from './online-badge';
import { MORE_LINKS } from './more-links';
import { PRIMARY_NAV } from './nav-items';

function titleFor(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const more = MORE_LINKS.find((link) => link.href === clean);
  if (more) return more.label;
  const primary = PRIMARY_NAV.find((item) => item.href === clean);
  if (primary) return primary.label === 'Home' ? 'Wedding Ops' : primary.label;
  if (clean.startsWith('/tasks')) return 'Tasks';
  if (clean.startsWith('/more')) return 'More';
  return 'Wedding Ops';
}

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-ivory/95 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <h1 className="truncate font-serif text-xl">{titleFor(pathname)}</h1>
        <OnlineBadge />
      </div>
    </header>
  );
}
