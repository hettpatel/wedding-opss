import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/app-providers';
import { AppShell } from '@/components/shell/app-shell';
import { BASE_PATH } from '@/lib/base-path';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wedding Ops',
  description: 'Personal wedding task, guest and invitation manager. Works offline.',
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  applicationName: 'Wedding Ops',
  appleWebApp: { capable: true, title: 'Wedding Ops', statusBarStyle: 'default' },
  icons: {
    icon: `${BASE_PATH}/icons/icon-192.png`,
    apple: `${BASE_PATH}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: '#800020',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-crimson focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
