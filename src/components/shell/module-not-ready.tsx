import { Hammer } from 'lucide-react';
import Link from 'next/link';

/**
 * Honest placeholder for a module that has not been built yet. It never pretends to work
 * and never offers a button that does nothing.
 */
export function ModuleNotReady({
  title,
  phase,
  planned,
}: {
  title: string;
  phase: string;
  planned: string[];
}) {
  return (
    <div className="app-card space-y-4 p-5">
      <div className="flex items-center gap-2 text-crimson">
        <Hammer className="h-5 w-5" aria-hidden />
        <h2 className="text-base font-semibold">{title} is not built yet</h2>
      </div>
      <p className="text-sm text-muted">
        This screen is part of {phase}. Nothing here works yet, so it has been left empty rather
        than filled with buttons that do nothing.
      </p>
      <div>
        <p className="text-sm font-medium">Planned for this screen</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {planned.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="text-gold">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/tasks"
        className="flex min-h-touch w-full items-center justify-center rounded-lg border border-crimson/30 bg-white px-4 text-[15px] font-semibold text-crimson"
      >
        Go to Tasks
      </Link>
    </div>
  );
}
