import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2'
import { CharacterCardItem, type SpineCardConfig } from './character-card-item'
import { RenameTaskButton } from './rename-task-button'
import { DeleteTaskInline } from './delete-task-inline'
import type { PrvTask, PrvProject, PrvAsset } from '@/lib/types/database'

interface CharacterCardGridProps {
  tasks: PrvTask[]
  project: PrvProject
  linkPrefix: string
  readonly: boolean
  /** clientId — required when readonly=false to show rename/delete actions */
  clientId?: string
}

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
        artUrl = await getPresignedGetUrl(firstArt.r2_key).catch(() => undefined)
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

  const showActions = !readonly && !!clientId

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {taskData.map(({ task, artUrl, spineConfig }) => (
        <div key={task.id} className="flex flex-col gap-2">
          <CharacterCardItem
            task={task}
            href={`${linkPrefix}/characters/${task.id}`}
            artUrl={artUrl}
            spineConfig={spineConfig}
          />
          {showActions && (
            <div className="flex gap-1">
              <RenameTaskButton task={task} clientId={clientId!} />
              <DeleteTaskInline task={task} clientId={clientId!} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
