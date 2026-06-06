'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { createTask } from '@/lib/actions/tasks'

interface TaskManagerProps {
  projectId: string
  clientId: string
}

export function TaskManager({ projectId, clientId }: TaskManagerProps) {
  const router = useRouter()
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const result = await createTask({ project_id: projectId, client_id: clientId, name: name.trim() })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setName('')
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
        Add Character
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Character name…"
        className="flex-1 max-w-[220px] px-3 py-2 rounded-xl text-sm text-white outline-none transition-colors"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,149,0,0.4)',
        }}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
        style={{ background: '#FF9500', color: '#080808' }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(''); setError(null) }}
        className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        style={{ color: '#666', background: 'rgba(255,255,255,0.04)' }}
      >
        Cancel
      </button>
      {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
    </form>
  )
}
