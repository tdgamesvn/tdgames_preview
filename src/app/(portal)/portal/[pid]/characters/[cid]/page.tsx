import { createClient } from '@/lib/supabase/server'
import { getPublicUrl } from '@/lib/r2'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArtFilmstrip } from '@/components/portal/art-filmstrip'
import { SectionHeader } from '@/components/portal/section-header'
import { SpineAnimationGallery } from '@/components/dashboard/spine-animation-gallery'
import { VfxInlineGrid } from '@/components/portal/vfx-inline-grid'
import { Comments } from '@/components/preview/comments'
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
  const artAssets  = allAssets.filter(a => a.service_type === 'art')
  const animAssets = allAssets.filter(a => a.service_type === 'animation')
  const vfxAssets  = allAssets.filter(a => a.service_type === 'vfx')

  // Get public URLs for art filmstrip
  const artWithUrls = artAssets.map(a => ({
    id: a.id,
    name: a.name,
    presignedUrl: getPublicUrl(a.r2_key),
  }))
  const filmstripAssets = artWithUrls.filter(a => a.presignedUrl)

  // Get public URLs for VFX inline auto-play grid
  const vfxWithUrls = vfxAssets.map(a => ({
    id: a.id,
    name: a.name,
    fileType: a.file_type,
    presignedUrl: getPublicUrl(a.r2_key),
  }))
  const vfxCards = vfxWithUrls.filter(a => a.presignedUrl)

  // Animation gallery: find json + atlas pair in animAssets
  const jsonAnim = animAssets.find(a => a.name.endsWith('.json'))
  const atlasAnim = jsonAnim
    ? animAssets.find(
        a => a.name.endsWith('.atlas') && a.name.startsWith(jsonAnim.name.replace('.json', ''))
      )
    : undefined

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-6 flex-wrap"
        style={{ color: '#888' }}
      >
        <Link href="/portal" className="hover:text-white transition-colors">Projects</Link>
        <span>›</span>
        <Link href={`/portal/${params.pid}`} className="hover:text-white transition-colors">{project.name}</Link>
        <span>›</span>
        <span className="text-white">{task.name}</span>
      </nav>

      {/* Character name */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          {task.name}
        </h1>
        <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#444' }}>
          {project.name}
        </p>
      </div>

      {/* Zones B–E — padded content */}
      <div className="space-y-12 mt-10">

        {/* Zone B — Art filmstrip */}
        {filmstripAssets.length > 0 && (
          <section>
            <SectionHeader label="Art" count={filmstripAssets.length} />
            <ArtFilmstrip assets={filmstripAssets} allowDownload={project.allow_download ?? true} />
          </section>
        )}

        {/* Zone C — Animation gallery (all animations from Spine file) */}
        {jsonAnim && atlasAnim && project.spine_version && (
          <section>
            <SectionHeader label="Animations" />
            <SpineAnimationGallery
              taskId={task.id}
              jsonName={jsonAnim.name}
              atlasName={atlasAnim.name}
              spineVersion={project.spine_version}
              cardBgType={project.card_bg_type}
              cardBgValue={project.card_bg_value}
              lockedSkin={project.default_skin}
            />
          </section>
        )}

        {/* Zone D — VFX (inline auto-play, IntersectionObserver) */}
        {vfxCards.length > 0 && (
          <section>
            <SectionHeader label="VFX" count={vfxCards.length} />
            <VfxInlineGrid assets={vfxCards} allowDownload={project.allow_download ?? true} />
          </section>
        )}

        {/* Zone E — Comments (hidden when disabled for this project) */}
        {(project.allow_comments ?? true) && (
          <section>
            <details open>
              <summary
                className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none mb-4"
                style={{ color: '#444', listStyle: 'none' }}
              >
                ▾ &nbsp;Project Comments
              </summary>
              <Comments projectId={project.id} />
            </details>
          </section>
        )}

      </div>
    </div>
  )
}
