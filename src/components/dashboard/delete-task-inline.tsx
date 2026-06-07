import { Trash2 } from 'lucide-react'
import { deleteTask } from '@/lib/actions/tasks'
import type { PrvTask } from '@/lib/types/database'

interface DeleteTaskInlineProps {
  task: PrvTask
  clientId: string
}

export function DeleteTaskInline({ task, clientId }: DeleteTaskInlineProps) {
  return (
    <form
      action={async () => {
        'use server'
        await deleteTask({ task_id: task.id, project_id: task.project_id, client_id: clientId })
      }}
    >
      <button
        type="submit"
        title={`Delete "${task.name}"`}
        className="p-1.5 rounded-lg transition-all hover:bg-red-500/15"
        style={{ color: '#444', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Trash2 size={11} />
      </button>
    </form>
  )
}
