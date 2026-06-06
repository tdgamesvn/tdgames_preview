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

  // Generate presigned URLs for art thumbnails server-side
  const artAssets = allAssets.filter(a => a.service_type === 'art')
  const presignedEntries = await Promise.all(
    artAssets.map(async a => {
      try {
        return [a.id, await getPresignedGetUrl(a.r2_key)] as const
      } catch {
        return [a.id, ''] as const
      }
    })
  )
  const presignedUrls = Object.fromEntries(presignedEntries)

  const assetsFor = (st: string) => allAssets.filter(a => a.service_type === st)

  const artCount       = assetsFor('art').length
  const animCount      = assetsFor('animation').length
  const vfxCount       = assetsFor('vfx').length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider flex-wrap">
        <Link
          href="/portal"
          className="transition-colors hover:text-white"
          style={{ color: '#444' }}
        >
          Projects
        </Link>
        <span style={{ color: '#333' }}>›</span>
        <Link
          href={`/portal/${params.pid}`}
          className="transition-colors hover:text-white"
          style={{ color: '#444' }}
        >
          {project.name}
        </Link>
        <span style={{ color: '#333' }}>›</span>
        <span className="text-white">{task.name}</span>
      </nav>

      {/* Character heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">{task.name}</h1>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#444' }}>
          {project.name}
        </p>
      </div>

      {/* Asset count summary */}
      <div className="flex items-center gap-4">
        {artCount > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>
            🖼 {artCount} Art
          </span>
        )}
        {animCount > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>
            🦴 {animCount} Animation
          </span>
        )}
        {vfxCount > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>
            🎬 {vfxCount} VFX
          </span>
        )}
        {allAssets.length === 0 && (
          <span className="text-xs" style={{ color: '#444' }}>No assets yet</span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={artCount > 0 ? 'art' : animCount > 0 ? 'animation' : 'vfx'}>
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art {artCount > 0 && <TabCount n={artCount} />}</TabsTrigger>
          <TabsTrigger value="animation">Animation {animCount > 0 && <TabCount n={animCount} />}</TabsTrigger>
          <TabsTrigger value="vfx">VFX {vfxCount > 0 && <TabCount n={vfxCount} />}</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          {artCount === 0 ? (
            <EmptyTab label="Art" />
          ) : (
            <AssetGridClient
              assets={assetsFor('art')}
              serviceType="art"
              projectId={project.id}
              presignedUrls={presignedUrls}
              readonly
            />
          )}
        </TabsContent>

        <TabsContent value="animation">
          {animCount === 0 ? (
            <EmptyTab label="Animation" />
          ) : (
            <AssetGridClient
              assets={assetsFor('animation')}
              serviceType="animation"
              spineVersion={project.spine_version}
              projectId={project.id}
              readonly
            />
          )}
        </TabsContent>

        <TabsContent value="vfx">
          {vfxCount === 0 ? (
            <EmptyTab label="VFX" />
          ) : (
            <AssetGridClient
              assets={assetsFor('vfx')}
              serviceType="vfx"
              projectId={project.id}
              readonly
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TabCount({ n }: { n: number }) {
  return (
    <span
      className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(255,149,0,0.15)', color: '#FF9500' }}
    >
      {n}
    </span>
  )
}

function EmptyTab({ label }: { label: string }) {
  const icons: Record<string, string> = { Art: '🖼', Animation: '🦴', VFX: '🎬' }
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-4xl opacity-30">{icons[label]}</span>
      <p className="text-sm font-semibold" style={{ color: '#444' }}>
        No {label} assets yet
      </p>
      <p className="text-xs" style={{ color: '#333' }}>
        Check back soon — our team is working on it.
      </p>
    </div>
  )
}
