import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, PrvProject, PrvTask } from '@/lib/types/database'

const SERVICE_LABELS = { art: '🖼 Art', animation: '🦴 Animation', vfx: '🎬 VFX' } as const

type AssetWithUrl = PrvAsset & { presignedUrl: string }

interface Props { params: { token: string } }

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = (await admin
    .from('Prv_projects').select('*').eq('share_token', params.token).eq('share_enabled', true).single()) as { data: PrvProject | null }

  if (!project) notFound()

  const [{ data: assets }, { data: tasks }] = await Promise.all([
    admin.from('Prv_assets').select('*').eq('project_id', project.id).order('sort_order').order('created_at') as Promise<{ data: PrvAsset[] | null }>,
    admin.from('Prv_tasks').select('*').eq('project_id', project.id).order('sort_order').order('created_at') as Promise<{ data: PrvTask[] | null }>,
  ])

  const allAssets: AssetWithUrl[] = (assets ?? []).map((a) => ({ ...a, presignedUrl: getPublicUrl(a.r2_key) }))
  const taskList = tasks ?? []

  const assetsFor = (taskId: string | null, st: string) =>
    allAssets.filter(a => a.task_id === taskId && a.service_type === st)

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-4 sm:px-6 py-3 flex items-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0F0F0F' }}>
        <span className="text-xs font-black uppercase tracking-widest text-white">TDGAME</span>
        <span className="text-[9px] font-black uppercase tracking-widest ml-2 px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,149,0,0.08)', color: '#FF9500' }}>Preview</span>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-white">{project.name}</h1>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(33,150,243,0.15)', color: '#2196F3' }}>Shared Preview</span>
        </div>

        {project.description && <p className="text-sm text-neutral-medium">{project.description}</p>}

        <Tabs defaultValue="characters">
          <TabsList className="mb-6">
            <TabsTrigger value="characters">Characters</TabsTrigger>
          </TabsList>

          <TabsContent value="characters">
            <div className="space-y-5">
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
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
