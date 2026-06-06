'use client'

import { useEffect } from 'react'

interface ErrorViewProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Shared error boundary UI. Logs the full error (including digest) to the
 * browser console so production "client-side exception" crashes surface a
 * traceable id, and offers the user a retry instead of a blank page.
 */
export function ErrorView({ error, reset }: ErrorViewProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, error.digest ? `digest=${error.digest}` : '')
  }, [error])

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ color: '#aaa' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
      >
        !
      </div>
      <div className="space-y-1">
        <p className="text-base font-black uppercase tracking-wider text-white">
          Something went wrong
        </p>
        <p className="text-sm" style={{ color: '#888' }}>
          An unexpected error occurred while loading this page.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono mt-2" style={{ color: '#555' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#FF9500', color: '#080808' }}
      >
        Try again
      </button>
    </div>
  )
}
