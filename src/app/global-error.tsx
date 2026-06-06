'use client'

import { useEffect } from 'react'

/**
 * Catches errors thrown in the root layout itself (where the normal error.tsx
 * boundary cannot render). Must provide its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', error, error.digest ? `digest=${error.digest}` : '')
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#080808',
          color: '#aaa',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 32,
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: '#fff' }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 14, color: '#888' }}>The application failed to load.</p>
        {error.digest && (
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#555' }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            background: '#FF9500',
            color: '#080808',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
