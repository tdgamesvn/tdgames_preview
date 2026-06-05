'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AssetViewerModal } from '@/components/preview/asset-viewer-modal'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridClientProps {
  assets: PrvAsset[]
  serviceType: ServiceType
  spineVersion?: string | null
  projectId: string
}

const typeIcon = (t: ServiceType) =>
  t === 'art' ? '🖼️' : t === 'animation' ? '🦴' : '🎬'

export function AssetGridClient({
  assets,
  serviceType,
  spineVersion,
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
}: AssetGridClientProps) {
  const [viewingAsset, setViewingAsset] = useState<PrvAsset | null>(null)

  if (!assets.length) {
    return (
      <p className="text-gray-400 text-sm">
        No {serviceType} assets yet. Upload above.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-white rounded-lg shadow overflow-hidden group cursor-pointer"
            onClick={() => setViewingAsset(asset)}
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="text-3xl">{typeIcon(serviceType)}</span>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-xs text-gray-400 uppercase">{asset.file_type}</p>
            </div>
            <div className="px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <form
                action={`/api/assets/${asset.id}`}
                method="DELETE"
                onClick={(e) => e.stopPropagation()}
              >
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

      {viewingAsset && (
        <AssetViewerModal
          asset={viewingAsset}
          allArtAssets={serviceType === 'art' ? assets : []}
          spineVersion={spineVersion}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </>
  )
}
