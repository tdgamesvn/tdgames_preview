'use client'

import { useEffect } from 'react'

import { hardReload } from '@/lib/reload'

interface ErrorViewProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Shared error boundary UI. Logs the full error (including digest) to the
 * browser console so production "client-side exception" crashes surface a
 * traceable id, and offers the user a retry instead of a blank page.
 */
/**
 * Detect a webpack/Next.js chunk-load failure. This happens when a new version
 * is deployed while a tab is open: the client references JS chunks from the
 * previous build that no longer exist on the server (404). `reset()` cannot
 * recover from it — only a fresh document load fetches the new build's chunks.
 */
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /loading chunk [^ ]+ failed|chunkloaderror/i.test(error.message)
  )
}

export function ErrorView({ error, reset }: ErrorViewProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, error.digest ? `digest=${error.digest}` : '')

    // A stale-deploy ChunkLoadError self-heals with a hard reload. Guard against
    // a reload loop (e.g. the new build is genuinely broken) by only reloading
    // once per short window.
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      const KEY = '__tdg_chunk_reload_at'
      const last = Number(window.sessionStorage.getItem(KEY) || 0)
      const now = Date.now()
      if (now - last > 10_000) {
        window.sessionStorage.setItem(KEY, String(now))
        hardReload()
      }
    }
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
