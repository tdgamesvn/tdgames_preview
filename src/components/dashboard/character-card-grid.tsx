import { createClient } from '@/lib/supabase/server'
import { getPublicUrl } from '@/lib/r2'
import { CharacterCardPager } from './character-card-pager'
import type { SpineCardConfig } from './character-card-item'
import type { PrvTask, PrvProject, PrvAsset } from '@/lib/types/database'

interface CharacterCardGridProps {
  tasks: PrvTask[]
  project: PrvProject
  linkPrefix: string
  readonly: boolean
  /** clientId — required when readonly=false to show rename/delete actions */
  clientId?: string
}

/**
 * Server component: fetches artUrl + spineConfig for every task, then
 * hands the full data set to CharacterCardPager which handles client-side
 * pagination (PAGE_SIZE=8).  Rendering only 8 cards at a time keeps
 * concurrent WebGL contexts within browser limits.
 */
export async function CharacterCardGrid({ tasks, project, linkPrefix, readonly, clientId }: CharacterCardGridProps) {
  if (tasks.length === 0) return null

  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const taskData = await Promise.all(
    tasks.map(async (task) => {
      const [{ data: artAssets }, spineResult] = await Promise.all([
        (supabase
          .from('Prv_assets')
          .select('*')
          .eq('project_id', project.id)
          .eq('task_id', task.id)
          .eq('service_type', 'art')
          .order('sort_order')
          .order('created_at')
          .limit(1)) as Promise<{ data: PrvAsset[] | null }>,
        task.avatar_asset_id
          ? (supabase
              .from('Prv_assets')
              .select('*')
              .eq('id', task.avatar_asset_id)
              .single() as Promise<{ data: PrvAsset | null }>)
          : Promise.resolve({ data: null } as { data: PrvAsset | null }),
      ])

      let artUrl: string | undefined
      const firstArt = artAssets?.[0]
      if (firstArt) {
        artUrl = getPublicUrl(firstArt.r2_key)
      }

      let spineConfig: SpineCardConfig | undefined
      const spineAsset = spineResult.data
      if (spineAsset && project.spine_version && task.avatar_asset_id) {
        const base = spineAsset.name.replace(/\.[^./]+$/, '')
        spineConfig = {
          jsonUrl: `/api/spine/${task.id}/${encodeURIComponent(spineAsset.name)}`,
          atlasUrl: `/api/spine/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
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
    <CharacterCardPager
      taskData={taskData}
      project={project}
      linkPrefix={linkPrefix}
      showActions={!readonly && !!clientId}
      clientId={clientId}
    />
  )
}
