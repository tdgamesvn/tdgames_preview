import { createClient } from '@/lib/supabase/server'
import { getPublicUrl } from '@/lib/r2'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
  spineVersion?: string | null
  taskId?: string | null  // undefined = all, string = specific task, null = ungrouped
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
  projectDefaultSkin?: string | null
}

export async function AssetGrid({ projectId, serviceType, spineVersion, taskId, cardBgType, cardBgValue, projectDefaultSkin }: AssetGridProps) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)

  if (taskId === null) {
    // ungrouped assets → task_id IS NULL
    query = query.is('task_id', null)
  } else if (taskId !== undefined) {
    // specific task → task_id = <uuid>  (.is() only supports null/boolean)
    query = query.eq('task_id', taskId)
  }

  const { data: assets } = (await query
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const assetList = assets ?? []

  // Generate public URLs for art thumbnails (server-side only)
  let presignedUrls: Record<string, string> = {}
  if (serviceType === 'art' && assetList.length > 0) {
    presignedUrls = Object.fromEntries(assetList.map((a) => [a.id, getPublicUrl(a.r2_key)]))
  }

  return (
    <div className="space-y-4">
      <AssetUpload projectId={projectId} serviceType={serviceType} taskId={taskId} existingAssets={assetList} />
      <AssetGridClient
        assets={assetList}
        serviceType={serviceType}
        spineVersion={spineVersion}
        projectId={projectId}
        presignedUrls={presignedUrls}
        cardBgType={cardBgType}
        cardBgValue={cardBgValue}
        projectDefaultSkin={projectDefaultSkin}
      />
    </div>
  )
}
