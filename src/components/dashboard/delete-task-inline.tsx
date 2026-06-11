'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteTask } from '@/lib/actions/tasks'
import type { PrvTask } from '@/lib/types/database'

interface DeleteTaskInlineProps {
  task: PrvTask
  clientId: string
}

export function DeleteTaskInline({ task, clientId }: DeleteTaskInlineProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteTask({ task_id: task.id, project_id: task.project_id, client_id: clientId })
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title={`Delete "${task.name}"`}
      className="p-1.5 rounded-lg transition-all hover:bg-red-500/15 disabled:opacity-40"
      style={{ color: '#444', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
    </button>
  )
}
