import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'
import { PortalCharacterGrid, type CharacterCardData } from '@/components/portal/portal-character-grid'
import { CommentsDrawer } from '@/components/portal/comments-drawer'
import type { SpineCardConfig } from '@/components/dashboard/character-card-item'
import type { PrvAsset, PrvProject, PrvTask } from '@/lib/types/database'

interface Props { params: { token: string } }

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = (await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: PrvProject | null }

  if (!project) notFound()

  const { data: tasks } = (await admin
    .from('Prv_tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvTask[] | null }

  const taskList = tasks ?? []

  const spineApiBase = `/api/share-spine/${params.token}`

  const cards: CharacterCardData[] = await Promise.all(
    taskList.map(async (task) => {
      const [{ data: artAssets }, spineResult] = await Promise.all([
        admin
          .from('Prv_assets')
          .select('*')
          .eq('project_id', project.id)
          .eq('task_id', task.id)
          .eq('service_type', 'art')
          .order('sort_order')
          .order('created_at')
          .limit(1) as Promise<{ data: PrvAsset[] | null }>,
        task.avatar_asset_id
          ? (admin
              .from('Prv_assets')
              .select('*')
              .eq('id', task.avatar_asset_id)
              .single() as Promise<{ data: PrvAsset | null }>)
          : Promise.resolve({ data: null } as { data: PrvAsset | null }),
      ])

      const artUrl = artAssets?.[0] ? getPublicUrl(artAssets[0].r2_key) : undefined

      let spineConfig: SpineCardConfig | undefined
      const spineAsset = spineResult.data
      if (spineAsset && project.spine_version && task.avatar_asset_id) {
        const base = spineAsset.name.replace(/\.[^./]+$/, '')
        spineConfig = {
          jsonUrl: `${spineApiBase}/${task.id}/${encodeURIComponent(spineAsset.name)}`,
          atlasUrl: `${spineApiBase}/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
          animationName: task.avatar_animation ?? '',
          skinName: task.avatar_skin ?? '',
          scale: task.avatar_scale ?? 1,
          offsetX: task.avatar_offset_x ?? 0,
          offsetY: task.avatar_offset_y ?? 0,
          spineVersion: project.spine_version,
        }
      }

      return { task, artUrl, spineConfig }
    })
  )

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div
        className="flex items-start justify-between gap-4 pb-7"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="space-y-2 min-w-0">
          <h1
            className="font-black uppercase tracking-wider text-white leading-none truncate"
            style={{ fontSize: 'clamp(18px, 3.5vw, 30px)', letterSpacing: '0.06em' }}
          >
            {project.name}
          </h1>
          {project.description && (
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#666', maxWidth: '54ch' }}
            >
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className="inline-flex items-center font-black uppercase tracking-widest rounded"
              style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                padding: '2px 8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: '#555',
              }}
            >
              {taskList.length} character{taskList.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {(project.allow_comments ?? true) && (
          <div className="shrink-0 pt-1">
            <CommentsDrawer projectId={project.id} />
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {taskList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No assets uploaded yet</p>
          <p className="text-xs mt-1" style={{ color: '#333' }}>
            Check back soon — our team is working on it.
          </p>
        </div>
      ) : (
        <PortalCharacterGrid
          cards={cards}
          linkPrefix={`/share/${params.token}`}
          cardBgType={project.card_bg_type}
          cardBgValue={project.card_bg_value}
        />
      )}
    </div>
  )
}
