'use client';

import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ivory">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="page-scroll mx-auto w-full max-w-3xl flex-1 px-4 py-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
