import { createClient } from '@/lib/supabase/server'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { Button } from '@/components/ui/button'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
}

export async function AssetGrid({ projectId, serviceType }: AssetGridProps) {
  const supabase = await createClient()
  const { data: assets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const typeIcon =
    serviceType === 'art' ? '🖼️' : serviceType === 'animation' ? '🦴' : '🎬'

  return (
    <div className="space-y-6">
      <AssetUpload projectId={projectId} serviceType={serviceType} />

      {!assets?.length ? (
        <p className="text-gray-400 text-sm">
          No {serviceType} assets yet. Upload above.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-lg shadow overflow-hidden group"
            >
              {/* Thumbnail placeholder — real preview in P3 */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <span className="text-3xl">{typeIcon}</span>
              </div>
              <div className="p-3">
                <p
                  className="text-sm font-medium truncate"
                  title={asset.name}
                >
                  {asset.name}
                </p>
                <p className="text-xs text-gray-400 uppercase">
                  {asset.file_type}
                </p>
              </div>
              <div className="px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <form action={`/api/assets/${asset.id}`} method="DELETE">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 w-full text-xs"
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
