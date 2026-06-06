import { createClient } from '@/lib/supabase/server'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
  spineVersion?: string | null
  taskId?: string | null  // undefined = all assets, string = specific task, null = ungrouped
}

export async function AssetGrid({ projectId, serviceType, spineVersion, taskId }: AssetGridProps) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)

  if (taskId !== undefined) {
    query = query.is('task_id', taskId)
  }

  const { data: assets } = (await query
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  return (
    <div className="space-y-4">
      <AssetUpload projectId={projectId} serviceType={serviceType} taskId={taskId} />
      <AssetGridClient
        assets={assets ?? []}
        serviceType={serviceType}
        spineVersion={spineVersion}
        projectId={projectId}
      />
    </div>
  )
}
