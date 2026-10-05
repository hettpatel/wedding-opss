import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-card space-y-3 p-5">
      <h2 className="text-base font-semibold">This screen does not exist</h2>
      <p className="text-sm text-muted">
        The link may be old, or the screen has not been built yet. Your data is untouched.
      </p>
      <Link href="/" className="text-sm font-medium text-crimson">
        Go to Home
      </Link>
    </div>
  );
}
