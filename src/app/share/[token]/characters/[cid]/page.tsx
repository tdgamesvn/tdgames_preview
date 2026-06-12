import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'
import { ShowcaseHero } from '@/components/portal/showcase-hero'
import { ArtFilmstrip } from '@/components/portal/art-filmstrip'
import { SectionHeader } from '@/components/portal/section-header'
import { SpineAnimationGallery } from '@/components/dashboard/spine-animation-gallery'
import { VfxInlineGrid } from '@/components/portal/vfx-inline-grid'
import type { PrvAsset, PrvProject, PrvTask } from '@/lib/types/database'

interface Props { params: { token: string; cid: string } }

export default async function ShareCharacterPage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate share token
  const { data: project } = (await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: PrvProject | null }

  if (!project) notFound()

  // Validate character (task) belongs to this project
  const { data: task } = (await admin
    .from('Prv_tasks')
    .select('*')
    .eq('id', params.cid)
    .eq('project_id', project.id)
    .single()) as { data: PrvTask | null }

  if (!task) notFound()

  // Fetch all assets for this character
  const { data: assets } = (await admin
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

  const spineApiBase = `/api/share-spine/${params.token}`

  // Art filmstrip assets
  const filmstripAssets = artAssets
    .map(a => ({ id: a.id, name: a.name, presignedUrl: getPublicUrl(a.r2_key) }))
    .filter(a => a.presignedUrl)

  // VFX grid assets
  const vfxCards = vfxAssets
    .map(a => ({ id: a.id, name: a.name, fileType: a.file_type, presignedUrl: getPublicUrl(a.r2_key) }))
    .filter(a => a.presignedUrl)

  // Spine hero config
  let spineHeroConfig:
    | { jsonUrl: string; atlasUrl: string; animationName: string; spineVersion: string; spineAvatarBg: string }
    | undefined

  if (task.avatar_asset_id && project.spine_version) {
    const { data: spineAsset } = (await admin
      .from('Prv_assets')
      .select('name')
      .eq('id', task.avatar_asset_id)
      .single()) as { data: Pick<PrvAsset, 'name'> | null }

    if (spineAsset) {
      const base = spineAsset.name.replace(/\.[^./]+$/, '')
      spineHeroConfig = {
        jsonUrl:       `${spineApiBase}/${task.id}/${encodeURIComponent(spineAsset.name)}`,
        atlasUrl:      `${spineApiBase}/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
        animationName: task.avatar_animation ?? '',
        spineVersion:  project.spine_version,
        spineAvatarBg: project.card_bg_type === 'color' && project.card_bg_value
          ? project.card_bg_value
          : '#00000000',
      }
    }
  }

  // Animation gallery: json + atlas pair
  const jsonAnim  = animAssets.find(a => a.name.endsWith('.json'))
  const atlasAnim = jsonAnim
    ? animAssets.find(a => a.name.endsWith('.atlas') && a.name.startsWith(jsonAnim.name.replace('.json', '')))
    : undefined

  const heroArtUrl = filmstripAssets[0]?.presignedUrl

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-6 flex-wrap"
        style={{ color: '#888' }}
      >
        <Link href={`/share/${params.token}`} className="hover:text-white transition-colors">
          {project.name}
        </Link>
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

      {/* Zone A — Spine / Art hero */}
      <ShowcaseHero
        characterName={task.name}
        spineConfig={spineHeroConfig}
        artUrl={!spineHeroConfig ? heroArtUrl : undefined}
      />

      {/* Zones B–D — content sections */}
      <div className="space-y-12 mt-10">

        {/* Zone B — Art filmstrip (downloads disabled for anonymous) */}
        {filmstripAssets.length > 0 && (
          <section>
            <SectionHeader label="Art" count={filmstripAssets.length} />
            <ArtFilmstrip assets={filmstripAssets} allowDownload={false} />
          </section>
        )}

        {/* Zone C — Animation gallery */}
        {jsonAnim && atlasAnim && project.spine_version && (
          <section>
            <SectionHeader label="Animations" />
            <SpineAnimationGallery
              taskId={task.id}
              jsonName={jsonAnim.name}
              atlasName={atlasAnim.name}
              spineVersion={project.spine_version}
              spineApiBase={spineApiBase}
              cardBgType={project.card_bg_type}
              cardBgValue={project.card_bg_value}
            />
          </section>
        )}

        {/* Zone D — VFX (downloads disabled for anonymous) */}
        {vfxCards.length > 0 && (
          <section>
            <SectionHeader label="VFX" count={vfxCards.length} />
            <VfxInlineGrid assets={vfxCards} allowDownload={false} />
          </section>
        )}

      </div>
    </div>
  )
}
