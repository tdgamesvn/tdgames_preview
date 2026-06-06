import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, PrvProfile, PrvProject, PrvTask } from '@/lib/types/database'

export default async function PortalCharacterPage({
  params,
}: {
  params: { pid: string; cid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, role')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'role'> | null }

  const [{ data: project }, { data: task }] = await Promise.all([
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

  // Internal can preview any project; clients restricted to own
  const isInternal = profile?.role === 'internal'
  if (!project || (!isInternal && project.client_id !== profile?.client_id)) notFound()
  if (!task) notFound()

  const { data: assets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .eq('task_id', task.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const allAssets = assets ?? []

  // Generate presigned URLs for art thumbnails
  const artAssets = allAssets.filter(a => a.service_type === 'art')
  const presignedEntries = await Promise.all(
    artAssets.map(async a => {
      try {
        const url = await getPresignedGetUrl(a.r2_key)
        return [a.id, url] as const
      } catch {
        return [a.id, ''] as const
      }
    })
  )
  const presignedUrls = Object.fromEntries(presignedEntries)

  const assetsFor = (st: string) => allAssets.filter(a => a.service_type === st)

  return (
    <div className="space-y-5">
      {/* Back link + heading */}
      <div className="space-y-1">
        <Link
          href={`/portal/${params.pid}`}
          className="text-[10px] font-semibold uppercase tracking-wider transition-colors"
          style={{ color: '#555' }}
        >
          ← Back to project
        </Link>
        <h1 className="text-lg font-black uppercase tracking-wider text-white">{task.name}</h1>
      </div>

      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="vfx">VFX</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGridClient
            assets={assetsFor('art')}
            serviceType="art"
            projectId={project.id}
            presignedUrls={presignedUrls}
            readonly
          />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGridClient
            assets={assetsFor('animation')}
            serviceType="animation"
            spineVersion={project.spine_version}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGridClient
            assets={assetsFor('vfx')}
            serviceType="vfx"
            projectId={project.id}
            readonly
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
