import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, PrvProject } from '@/lib/types/database'

interface Props {
  params: { token: string }
}

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = (await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: PrvProject | null }

  if (!project) notFound()

  const { data: assets } = (await admin
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

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
    <div className="min-h-screen bg-bg">
      {/* Minimal branded header */}
      <header
        className="px-6 py-3 flex items-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0F0F0F' }}
      >
        <span className="text-xs font-black uppercase tracking-widest text-white">TDGAME</span>
        <span
          className="text-[9px] font-black uppercase tracking-widest ml-2 px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,149,0,0.08)', color: '#FF9500' }}
        >
          Preview
        </span>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        {/* Heading + shared badge */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-white">
            {project.name}
          </h1>
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(33,150,243,0.15)', color: '#2196F3' }}
          >
            Shared Preview
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
