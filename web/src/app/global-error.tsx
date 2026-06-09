'use client';

// Last-resort boundary: catches render errors in the root layout itself, where
// route-level error.tsx files can't help. It replaces the entire document, so it
// must render its own <html>/<body> and cannot rely on globals.css being loaded —
// hence the inline styles mirroring the dark palette.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0E0E0E',
          color: '#E5E5E5',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 20 }}>
            An unexpected error occurred. Please try again.
            {error.digest ? ` (Error ID: ${error.digest})` : ''}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#0095F6',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
