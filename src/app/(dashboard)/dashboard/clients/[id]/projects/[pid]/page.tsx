import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Comments } from '@/components/preview/comments'
import { TaskManager } from '@/components/dashboard/task-manager'
import { CharacterCardGrid } from '@/components/dashboard/character-card-grid'
import { deleteTask } from '@/lib/actions/tasks'
import { RenameTaskButton } from '@/components/dashboard/rename-task-button'
import type { PrvProject, PrvClient, PrvTask } from '@/lib/types/database'
import { Trash2, ExternalLink } from 'lucide-react'

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: client }, { data: project }, { data: tasks }] = await Promise.all([
    supabase
      .from('Prv_clients')
      .select('id, name')
      .eq('id', params.id)
      .single() as Promise<{ data: Pick<PrvClient, 'id' | 'name'> | null }>,
    supabase
      .from('Prv_projects')
      .select('*')
      .eq('id', params.pid)
      .single() as Promise<{ data: PrvProject | null }>,
    supabase
      .from('Prv_tasks')
      .select('*')
      .eq('project_id', params.pid)
      .order('sort_order')
      .order('created_at') as Promise<{ data: PrvTask[] | null }>,
  ])

  if (!client || !project) notFound()

  const taskList = tasks ?? []
  const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'
  const linkPrefix = `/dashboard/clients/${params.id}/projects/${params.pid}`

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider flex-wrap">
        <Link href="/dashboard/clients" className="text-neutral-medium hover:text-white transition-colors">
          Clients
        </Link>
        <span className="text-neutral-dark">›</span>
        <Link href={`/dashboard/clients/${params.id}`} className="text-neutral-medium hover:text-white transition-colors">
          {client.name}
        </Link>
        <span className="text-neutral-dark">›</span>
        <span className="text-white">{project.name}</span>
      </nav>

      {/* Heading */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-white">{project.name}</h1>
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {project.status}
          </span>
        </div>
        <Link
          href={`/portal/${project.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#888',
          }}
        >
          <ExternalLink size={11} />
          Preview as Client
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="characters">
        <TabsList className="mb-6">
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ── Characters tab ──────────────────────────── */}
        <TabsContent value="characters">
          <div className="space-y-6">
            {/* Add character button */}
            <TaskManager projectId={project.id} clientId={params.id} />

            {/* Character card grid */}
            {taskList.length > 0 && (
              <div className="space-y-3">
                {/* Cards */}
                <CharacterCardGrid
                  tasks={taskList}
                  project={project}
                  linkPrefix={linkPrefix}
                  readonly={false}
                />

                {/* Rename + Delete row below cards */}
                <div className="flex flex-wrap gap-3 items-start">
                  {taskList.map(task => (
                    <div key={task.id} className="flex items-center gap-1">
                      <RenameTaskButton task={task} clientId={params.id} />
                      <DeleteTaskButton task={task} clientId={params.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {taskList.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-3 opacity-30">🎭</p>
                <p className="text-sm font-semibold" style={{ color: '#555' }}>No characters yet</p>
                <p className="text-xs mt-1" style={{ color: '#333' }}>
                  Add characters above, then upload assets to each one.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-4">
              Project Comments
            </p>
            <Comments projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettingsForm project={project} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ── Delete task button (Server Action) ───────────────────── */
function DeleteTaskButton({ task, clientId }: { task: PrvTask; clientId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await deleteTask({ task_id: task.id, project_id: task.project_id, client_id: clientId })
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all hover:bg-red-500/10"
        style={{ color: '#555', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        title={`Delete ${task.name}`}
      >
        <Trash2 size={10} />
        {task.name}
      </button>
    </form>
  )
}
