import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { AvatarConfigPanel } from '@/components/dashboard/avatar-config-panel'
import type { PrvAsset, PrvClient, PrvProject, PrvTask } from '@/lib/types/database'

export default async function DashboardCharacterPage({
  params,
}: {
  params: { id: string; pid: string; cid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: client }, { data: project }, { data: task }] = await Promise.all([
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
      .eq('id', params.cid)
      .eq('project_id', params.pid)
      .single() as Promise<{ data: PrvTask | null }>,
  ])

  if (!client || !project || !task) notFound()

  // Fetch animation assets for this task (for AvatarConfigPanel)
  const { data: animAssets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .eq('task_id', task.id)
    .eq('service_type', 'animation')
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const animationAssets = animAssets ?? []

  // Presign json + atlas URLs for each animation asset (for AvatarConfigPanel live preview)
  const presignEntries = await Promise.all(
    animationAssets.map(async a => {
      try {
        const dir = a.r2_key.replace(/\/[^/]+$/, '')
        const [jsonUrl, atlasUrl] = await Promise.all([
          getPresignedGetUrl(a.r2_key),
          getPresignedGetUrl(`${dir}/skeleton.atlas`),
        ])
        return [a.id, { jsonUrl, atlasUrl }] as const
      } catch {
        return [a.id, { jsonUrl: '', atlasUrl: '' }] as const
      }
    })
  )
  const assetPresignedUrls = Object.fromEntries(presignEntries)

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">
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
        <Link href={`/dashboard/clients/${params.id}/projects/${params.pid}`} className="text-neutral-medium hover:text-white transition-colors">
          {project.name}
        </Link>
        <span className="text-neutral-dark">›</span>
        <span className="text-white">{task.name}</span>
      </nav>

      <h1 className="text-lg font-black uppercase tracking-wider text-white">{task.name}</h1>

      {/* Avatar config (dashboard only) */}
      <AvatarConfigPanel
        task={task}
        projectId={project.id}
        clientId={params.id}
        spineVersion={project.spine_version}
        animationAssets={animationAssets}
        assetPresignedUrls={assetPresignedUrls}
      />

      {/* Asset tabs */}
      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="vfx">VFX</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGrid
            projectId={project.id}
            serviceType="art"
            taskId={task.id}
          />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGrid
            projectId={project.id}
            serviceType="animation"
            spineVersion={project.spine_version}
            taskId={task.id}
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGrid
            projectId={project.id}
            serviceType="vfx"
            taskId={task.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
