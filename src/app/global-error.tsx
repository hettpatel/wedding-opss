'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#FFFDD0', color: '#241A1C', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 420, margin: '15vh auto', background: '#fff', border: '1px solid #E8E1D4', borderRadius: 12, padding: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, margin: '0 0 8px' }}>
            The app could not start
          </h1>
          <p style={{ color: '#6F6265', lineHeight: 1.5 }}>
            Your saved data is still on this phone. Close the app and open it again.
          </p>
          <p style={{ background: '#FFFDF2', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
            {error.message}
          </p>
          <button
            onClick={reset}
            style={{ minHeight: 48, width: '100%', background: '#800020', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
