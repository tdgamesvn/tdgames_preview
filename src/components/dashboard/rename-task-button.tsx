'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateTask } from '@/lib/actions/tasks'
import { useRouter } from 'next/navigation'
import type { PrvTask } from '@/lib/types/database'

interface RenameTaskButtonProps {
  task: PrvTask
  clientId: string
}

export function RenameTaskButton({ task, clientId }: RenameTaskButtonProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(task.name)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function handleSave() {
    if (value.trim() === task.name) { setEditing(false); return }
    setSaving(true)
    setError(null)
    const result = await updateTask({
      task_id: task.id,
      project_id: task.project_id,
      client_id: clientId,
      name: value,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setValue(task.name)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title={`Rename "${task.name}"`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all hover:bg-blue-500/10"
        style={{ color: '#555', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Pencil size={10} />
        {task.name}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs text-white outline-none w-36"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,149,0,0.5)' }}
          disabled={saving}
        />
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="p-1.5 rounded-lg disabled:opacity-40"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
          title="Save"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button
          onClick={handleCancel}
          className="p-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#666' }}
          title="Cancel"
        >
          <X size={10} />
        </button>
      </div>
      {error && <p className="text-[10px]" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
