import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Comments } from '@/components/preview/comments'
import type { PrvAsset, PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalProjectPage({
  params,
}: {
  params: { pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id'> | null }

  const { data: project } = (await supabase
    .from('Prv_projects')
    .select('*')
    .eq('id', params.pid)
    .single()) as { data: PrvProject | null }

  if (!project || project.client_id !== profile?.client_id) notFound()

  const { data: assets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const allAssets = assets ?? []
  const artAssets = allAssets.filter((a) => a.service_type === 'art')
  const animationAssets = allAssets.filter((a) => a.service_type === 'animation')
  const vfxAssets = allAssets.filter((a) => a.service_type === 'vfx')

  const statusColor = project.status === 'active' ? '#4CAF50' : '#9D9C9D'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Heading + status */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black uppercase tracking-wider text-white">
          {project.name}
        </h1>
        <span
          className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
          style={{ background: `${statusColor}20`, color: statusColor }}
        >
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-neutral-medium">{project.description}</p>
      )}

      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art ({artAssets.length})</TabsTrigger>
          <TabsTrigger value="animation">Animation ({animationAssets.length})</TabsTrigger>
          <TabsTrigger value="vfx">VFX ({vfxAssets.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGridClient
            assets={artAssets}
            serviceType="art"
            spineVersion={null}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGridClient
            assets={animationAssets}
            serviceType="animation"
            spineVersion={project.spine_version}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGridClient
            assets={vfxAssets}
            serviceType="vfx"
            spineVersion={null}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="comments">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-4">
              Project Comments
            </p>
            <Comments projectId={project.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
