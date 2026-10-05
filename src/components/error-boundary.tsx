'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Shown instead of a blank screen. */
  label?: string;
}

interface State {
  error: Error | null;
}

/** A crash inside one screen must never leave the person staring at a white page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void import('@/lib/db/repositories')
      .then(({ logAppError }) => logAppError('app', error.message, info.componentStack))
      .catch(() => undefined);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app-card space-y-3 p-5">
        <h2 className="text-base font-semibold text-error">
          {this.props.label ?? 'This screen'} stopped working
        </h2>
        <p className="text-sm text-muted">
          Nothing was deleted. Your tasks and guests are still saved on this phone. Try again, and
          if it keeps happening, export a backup from the More menu.
        </p>
        <p className="rounded bg-surface px-3 py-2 font-mono text-xs text-muted">{error.message}</p>
        <Button size="block" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
