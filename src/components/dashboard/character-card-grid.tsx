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

      // Spine config
      let spineConfig: SpineCardConfig | undefined
      const spineAsset = spineResult.data
      if (spineAsset && project.spine_version && task.avatar_asset_id) {
        // Derive atlas key from the json key (same directory, .atlas extension)
        const dir = spineAsset.r2_key.replace(/\/[^/]+$/, '')
        const atlasKey = `${dir}/skeleton.atlas`

        const [jsonUrl, atlasUrl] = await Promise.all([
          getPresignedGetUrl(spineAsset.r2_key).catch(() => ''),
          getPresignedGetUrl(atlasKey).catch(() => ''),
        ])

        if (jsonUrl && atlasUrl) {
          spineConfig = {
            jsonUrl,
            atlasUrl,
            animationName:
              task.avatar_animation ||
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((spineAsset.metadata as any)?.animations?.[0] ?? 'idle'),
            scale: task.avatar_scale ?? 1,
            offsetX: task.avatar_offset_x ?? 0,
            offsetY: task.avatar_offset_y ?? 0,
            spineVersion: project.spine_version,
          }
        }
      }

      return { task, artUrl, spineConfig }
    })
  )

  return (
    <div className="flex flex-wrap gap-4">
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
