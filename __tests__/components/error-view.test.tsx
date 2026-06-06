// __tests__/components/error-view.test.tsx
import { render, screen } from '@testing-library/react'
import { ErrorView } from '@/components/error-view'
import { hardReload } from '@/lib/reload'

jest.mock('@/lib/reload', () => ({ hardReload: jest.fn() }))

const reloadMock = hardReload as jest.Mock

describe('ErrorView', () => {
  const reset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('renders the fallback UI for a generic error', () => {
    render(<ErrorView error={new Error('boom')} reset={reset} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('auto-reloads once on a ChunkLoadError (stale deploy)', () => {
    const err = Object.assign(new Error('Loading chunk 969 failed.'), {
      name: 'ChunkLoadError',
    })
    render(<ErrorView error={err} reset={reset} />)
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('detects a chunk error by message even without the name', () => {
    render(<ErrorView error={new Error('Loading chunk 42 failed.')} reset={reset} />)
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within the guard window (no loop)', () => {
    window.sessionStorage.setItem('__tdg_chunk_reload_at', String(Date.now()))
    const err = Object.assign(new Error('ChunkLoadError'), { name: 'ChunkLoadError' })
    render(<ErrorView error={err} reset={reset} />)
    expect(reloadMock).not.toHaveBeenCalled()
  })
})
