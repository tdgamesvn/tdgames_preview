import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Badge } from '@/components/ui/badge'
import type { PrvAsset, PrvProject } from '@/lib/types/database'

interface Props {
  params: { token: string }
}

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single() as { data: PrvProject | null }

  if (!project) notFound()

  const { data: assets } = await admin
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at') as { data: PrvAsset[] | null }

  // Pre-generate presigned URLs server-side — no client auth needed
  const allAssets: (PrvAsset & { presignedUrl: string })[] = await Promise.all(
    (assets ?? []).map(async (asset) => ({
      ...asset,
      presignedUrl: await getPresignedGetUrl(asset.r2_key).catch(() => ''),
    }))
  )

  const artAssets = allAssets.filter((a) => a.service_type === 'art')
  const animationAssets = allAssets.filter((a) => a.service_type === 'animation')
  const vfxAssets = allAssets.filter((a) => a.service_type === 'vfx')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal branded header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <span className="font-semibold text-gray-800">TDGame Preview</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <Badge variant="secondary">Shared Preview</Badge>
        </div>

        {project.description && (
          <p className="text-gray-600 mb-6">{project.description}</p>
        )}

        <Tabs defaultValue="art">
          <TabsList className="mb-6">
            <TabsTrigger value="art">Art ({artAssets.length})</TabsTrigger>
            <TabsTrigger value="animation">Animation ({animationAssets.length})</TabsTrigger>
            <TabsTrigger value="vfx">VFX ({vfxAssets.length})</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  )
}
