import { CalendarCheck, Home, Mail, MoreHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CalendarCheck },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/invitations', label: 'Invitations', icon: Mail },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function isActivePath(pathname: string, href: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (href === '/') return clean === '/';
  return clean === href || clean.startsWith(`${href}/`);
}
