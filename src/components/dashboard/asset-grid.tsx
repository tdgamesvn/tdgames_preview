import { createClient } from '@/lib/supabase/server'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
  spineVersion?: string | null
}

export async function AssetGrid({ projectId, serviceType, spineVersion }: AssetGridProps) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: assets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  return (
    <div className="space-y-6">
      <AssetUpload projectId={projectId} serviceType={serviceType} />
      <AssetGridClient
        assets={assets ?? []}
        serviceType={serviceType}
        spineVersion={spineVersion}
        projectId={projectId}
      />
    </div>
  )
}
