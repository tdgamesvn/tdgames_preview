import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Comments } from '@/components/preview/comments'
import { TaskManager } from '@/components/dashboard/task-manager'
import { deleteTask } from '@/lib/actions/tasks'
import type { PrvProject, PrvClient, PrvTask } from '@/lib/types/database'
import { Trash2, ExternalLink } from 'lucide-react'

const SERVICE_LABELS = { art: '🖼 Art', animation: '🦴 Animation', vfx: '🎬 VFX' } as const

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: client }, { data: project }, { data: tasks }] = await Promise.all([
    supabase.from('Prv_clients').select('id, name').eq('id', params.id).single() as Promise<{ data: Pick<PrvClient, 'id' | 'name'> | null }>,
    supabase.from('Prv_projects').select('*').eq('id', params.pid).single() as Promise<{ data: PrvProject | null }>,
    supabase.from('Prv_tasks').select('*').eq('project_id', params.pid).order('sort_order').order('created_at') as Promise<{ data: PrvTask[] | null }>,
  ])

  if (!client || !project) notFound()

  const taskList = tasks ?? []
  const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider flex-wrap">
        <Link href="/dashboard/clients" className="text-neutral-medium hover:text-white transition-colors">Clients</Link>
        <span className="text-neutral-dark">›</span>
        <Link href={`/dashboard/clients/${params.id}`} className="text-neutral-medium hover:text-white transition-colors">{client.name}</Link>
        <span className="text-neutral-dark">›</span>
        <span className="text-white">{project.name}</span>
      </nav>

      {/* Heading */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-white">{project.name}</h1>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
            style={{ background: `${statusColor}20`, color: statusColor }}>
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
          <div className="space-y-5">
            {/* Add character button */}
            <TaskManager projectId={project.id} clientId={params.id} />

            {/* Character cards */}
            {taskList.map((task) => (
              <CharacterCard
                key={task.id}
                task={task}
                project={project}
                clientId={params.id}
              />
            ))}

            {/* General (ungrouped) — always shown */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#555' }} />
                  <span className="text-sm font-semibold text-white">General</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>
                    ungrouped
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-6">
                {(['art', 'animation', 'vfx'] as const).map(st => (
                  <div key={st}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#555' }}>
                      {SERVICE_LABELS[st]}
                    </p>
                    <AssetGrid
                      projectId={project.id}
                      serviceType={st}
                      spineVersion={st === 'animation' ? project.spine_version : null}
                      taskId={null}
                    />
                  </div>
                ))}
              </div>
            </div>

            {taskList.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: '#444' }}>
                No characters yet — add one above, or upload directly to General
              </p>
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

/* ── Character Card ───────────────────────────────────────── */
function CharacterCard({
  task,
  project,
  clientId,
}: {
  task: PrvTask
  project: PrvProject
  clientId: string
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,149,0,0.03)', border: '1px solid rgba(255,149,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,149,0,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#FF9500' }} />
          <span className="text-sm font-semibold text-white">{task.name}</span>
        </div>
        <form
          action={async () => {
            'use server'
            await deleteTask({ task_id: task.id, project_id: task.project_id, client_id: clientId })
          }}
        >
          <button
            type="submit"
            className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
            style={{ color: '#555' }}
            title="Delete character"
          >
            <Trash2 size={13} />
          </button>
        </form>
      </div>

      {/* Service sections */}
      <div className="p-5 space-y-6">
        {(['art', 'animation', 'vfx'] as const).map(st => (
          <div key={st}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
              {SERVICE_LABELS[st]}
            </p>
            <AssetGrid
              projectId={project.id}
              serviceType={st}
              spineVersion={st === 'animation' ? project.spine_version : null}
              taskId={task.id}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
