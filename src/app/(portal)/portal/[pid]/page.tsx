import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Comments } from '@/components/preview/comments'
import type { PrvAsset, PrvProfile, PrvProject, PrvTask } from '@/lib/types/database'

const SERVICE_LABELS = { art: '🖼 Art', animation: '🦴 Animation', vfx: '🎬 VFX' } as const

export default async function PortalProjectPage({ params }: { params: { pid: string } }) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles').select('client_id').eq('id', user.id).single()) as { data: Pick<PrvProfile, 'client_id'> | null }

  const { data: project } = (await supabase
    .from('Prv_projects').select('*').eq('id', params.pid).single()) as { data: PrvProject | null }

  if (!project || project.client_id !== profile?.client_id) notFound()

  const [{ data: assets }, { data: tasks }] = await Promise.all([
    supabase.from('Prv_assets').select('*').eq('project_id', project.id).order('sort_order').order('created_at') as Promise<{ data: PrvAsset[] | null }>,
    supabase.from('Prv_tasks').select('*').eq('project_id', project.id).order('sort_order').order('created_at') as Promise<{ data: PrvTask[] | null }>,
  ])

  const allAssets = assets ?? []
  const taskList  = tasks  ?? []
  const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'

  // Filter helpers
  const assetsFor = (taskId: string | null, st: string) =>
    allAssets.filter(a => a.task_id === taskId && a.service_type === st)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black uppercase tracking-wider text-white">{project.name}</h1>
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
          style={{ background: `${statusColor}20`, color: statusColor }}>
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-neutral-medium">{project.description}</p>
      )}

      <Tabs defaultValue="characters">
        <TabsList className="mb-6">
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="characters">
          <div className="space-y-5">
            {/* Named characters */}
            {taskList.map((task) => (
              <div key={task.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,149,0,0.03)', border: '1px solid rgba(255,149,0,0.12)' }}>
                <div className="flex items-center gap-2.5 px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(255,149,0,0.1)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FF9500' }} />
                  <span className="text-sm font-semibold text-white">{task.name}</span>
                </div>
                <div className="p-5 space-y-6">
                  {(['art', 'animation', 'vfx'] as const).map(st => {
                    const filtered = assetsFor(task.id, st)
                    if (!filtered.length) return null
                    return (
                      <div key={st}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#888' }}>
                          {SERVICE_LABELS[st]}
                        </p>
                        <AssetGridClient assets={filtered} serviceType={st}
                          spineVersion={st === 'animation' ? project.spine_version : null}
                          projectId={project.id} readonly />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* General ungrouped */}
            {(['art', 'animation', 'vfx'] as const).some(st => assetsFor(null, st).length > 0) && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5 px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#555' }} />
                  <span className="text-sm font-semibold text-white">General</span>
                </div>
                <div className="p-5 space-y-6">
                  {(['art', 'animation', 'vfx'] as const).map(st => {
                    const filtered = assetsFor(null, st)
                    if (!filtered.length) return null
                    return (
                      <div key={st}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#555' }}>
                          {SERVICE_LABELS[st]}
                        </p>
                        <AssetGridClient assets={filtered} serviceType={st}
                          spineVersion={st === 'animation' ? project.spine_version : null}
                          projectId={project.id} readonly />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {allAssets.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🎨</p>
                <p className="text-sm text-neutral-medium">No assets uploaded yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-4">Project Comments</p>
            <Comments projectId={project.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
