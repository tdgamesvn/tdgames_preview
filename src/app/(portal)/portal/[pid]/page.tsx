import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Comments } from '@/components/preview/comments'
import { Badge } from '@/components/ui/badge'
import type { PrvAsset, PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalProjectPage({
  params,
}: {
  params: { pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get client_id from profile to enforce ownership
  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'client_id'> | null }

  const { data: project } = await supabase
    .from('Prv_projects')
    .select('*')
    .eq('id', params.pid)
    .single() as { data: PrvProject | null }

  // 404 if project not found or doesn't belong to this client
  if (!project || project.client_id !== profile?.client_id) notFound()

  const { data: assets } = await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at') as { data: PrvAsset[] | null }

  const allAssets = assets ?? []
  const artAssets = allAssets.filter((a) => a.service_type === 'art')
  const animationAssets = allAssets.filter((a) => a.service_type === 'animation')
  const vfxAssets = allAssets.filter((a) => a.service_type === 'vfx')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

      {project.description && (
        <p className="text-gray-600 mb-6">{project.description}</p>
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
          <div className="max-w-2xl">
            <Comments projectId={project.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
