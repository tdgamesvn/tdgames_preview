import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2'
import { CharacterCardItem, type SpineCardConfig } from './character-card-item'
import type { PrvTask, PrvProject, PrvAsset } from '@/lib/types/database'

interface CharacterCardGridProps {
  tasks: PrvTask[]
  project: PrvProject
  linkPrefix: string    // e.g. "/portal/pid123" or "/dashboard/clients/cid/projects/pid123"
  readonly: boolean
}

export async function CharacterCardGrid({ tasks, project, linkPrefix }: CharacterCardGridProps) {
  if (tasks.length === 0) return null

  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Resolve presigned URLs for each task's card preview (in parallel)
  const taskData = await Promise.all(
    tasks.map(async (task) => {
      const [{ data: artAssets }, spineResult] = await Promise.all([
        // First art asset → thumbnail fallback
        (supabase
          .from('Prv_assets')
          .select('*')
          .eq('project_id', project.id)
          .eq('task_id', task.id)
          .eq('service_type', 'art')
          .order('sort_order')
          .order('created_at')
          .limit(1)) as Promise<{ data: PrvAsset[] | null }>,

        // Spine avatar asset (if configured)
        task.avatar_asset_id
          ? (supabase
              .from('Prv_assets')
              .select('*')
              .eq('id', task.avatar_asset_id)
              .single() as Promise<{ data: PrvAsset | null }>)
          : Promise.resolve({ data: null } as { data: PrvAsset | null }),
      ])

      // Art thumbnail
      let artUrl: string | undefined
      const firstArt = artAssets?.[0]
      if (firstArt) {
        artUrl = await getPresignedGetUrl(firstArt.r2_key).catch(() => undefined)
      }

      // Spine config — serve via the /api/spine proxy so the texture (.png)
      // resolves relative to the atlas (presigned URLs break that). The atlas
      // file is named "<base>.atlas" alongside the json "<base>.json".
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {taskData.map(({ task, artUrl, spineConfig }) => (
        <CharacterCardItem
          key={task.id}
          task={task}
          href={`${linkPrefix}/characters/${task.id}`}
          artUrl={artUrl}
          spineConfig={spineConfig}
        />
      ))}
    </div>
  )
}
