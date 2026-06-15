import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { isInternalNetworkRequest } from '@/lib/share-access'
import { getPublicUrl } from '@/lib/r2'
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

  // IP restriction: when share_internal_only is on, only allow company network
  if (project.share_internal_only && !isInternalNetworkRequest()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">Access Restricted</h1>
        <p className="text-sm max-w-sm" style={{ color: '#666' }}>
          This preview is only available on the internal company network.
          Please connect via VPN or office Wi-Fi and try again.
        </p>
      </div>
    )
  }

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

  // Animation gallery: json + atlas pair
  const jsonAnim  = animAssets.find(a => a.name.endsWith('.json'))
  const atlasAnim = jsonAnim
    ? animAssets.find(a => a.name.endsWith('.atlas') && a.name.startsWith(jsonAnim.name.replace('.json', '')))
    : undefined

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
              lockedSkin={project.default_skin}
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
