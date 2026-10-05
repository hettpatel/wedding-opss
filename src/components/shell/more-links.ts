import {
  BadgeIndianRupee,
  Database,
  Info,
  MessageSquareText,
  Settings,
  Store,
  Save,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MoreLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
}

export const MORE_LINKS: MoreLink[] = [
  { href: '/more/vendors', label: 'Vendors', description: 'Contacts, quotes and balances', icon: Store, ready: false },
  { href: '/more/expenses', label: 'Expenses', description: 'What is spent and what is due', icon: BadgeIndianRupee, ready: false },
  { href: '/more/message-template', label: 'Message template', description: 'The WhatsApp text sent with invitations', icon: MessageSquareText, ready: true },
  { href: '/more/backup', label: 'Backup and restore', description: 'Save a copy of everything', icon: Save, ready: true },
  { href: '/more/settings', label: 'Settings', description: 'Event dates, venue and demo data', icon: Settings, ready: true },
  { href: '/more/storage', label: 'Storage usage', description: 'How much space this phone is using', icon: Database, ready: true },
  { href: '/more/about', label: 'About', description: 'Version and what works today', icon: Info, ready: true },
];
