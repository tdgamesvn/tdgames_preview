'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { createTasksBatch } from '@/lib/actions/tasks'

interface TaskManagerProps {
  projectId: string
  clientId: string
}

export function TaskManager({ projectId, clientId }: TaskManagerProps) {
  const router  = useRouter()
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)

  // Parse comma/newline separated names
  const names = input.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  const count = names.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!count) return
    setLoading(true)
    setError(null)
    const result = await createTasksBatch({ project_id: projectId, client_id: clientId, names })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setInput('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#FF9500', color: '#080808', boxShadow: '0 1px 8px rgba(255,149,0,0.3)' }}
      >
        <Plus size={14} />
        Add Characters
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 max-w-sm space-y-1">
          <textarea
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'Hero, Villain, Boss\nMinion A, Minion B'}
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,149,0,0.4)',
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setInput('') }
              // Ctrl/Cmd+Enter to submit
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <p className="text-[10px]" style={{ color: '#555' }}>
            Separate by comma or new line · {count > 0 ? <span style={{ color: '#FF9500' }}>{count} character{count > 1 ? 's' : ''} ready</span> : 'type names above'}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-0.5">
          <button
            type="submit"
            disabled={loading || !count}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all whitespace-nowrap"
            style={{ background: '#FF9500', color: '#080808' }}
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : count > 1 ? `Add ${count}` : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setInput(''); setError(null) }}
            className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: '#666', background: 'rgba(255,255,255,0.04)' }}
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
      )}
    </form>
  )
}
