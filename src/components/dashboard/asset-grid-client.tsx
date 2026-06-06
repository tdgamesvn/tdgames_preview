'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Eye } from 'lucide-react'
import { AssetViewerModal } from '@/components/preview/asset-viewer-modal'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridClientProps {
  assets: PrvAsset[]
  serviceType: ServiceType
  spineVersion?: string | null
  projectId: string
  readonly?: boolean
}

const TYPE_ICON: Record<ServiceType, string> = {
  art: '🖼️',
  animation: '🦴',
  vfx: '🎬',
}

export function AssetGridClient({
  assets,
  serviceType,
  spineVersion,
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
  readonly = false,
}: AssetGridClientProps) {
  const router = useRouter()
  const [viewingAsset, setViewingAsset] = useState<PrvAsset | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (!assets.length) {
    return (
      <p className="text-xs italic" style={{ color: '#444' }}>
        No {serviceType} assets yet — drop files above to upload.
      </p>
    )
  }

  async function handleDelete(e: React.MouseEvent, assetId: string) {
    e.stopPropagation()
    if (!confirm('Delete this asset?')) return
    setDeleting(assetId)
    await fetch(`/api/assets/${assetId}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => setViewingAsset(asset)}
            title="Click to preview"
            className="group relative cursor-pointer rounded-xl overflow-hidden transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,149,0,0.35)'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,149,0,0.04)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            {/* Thumbnail area */}
            <div
              className="aspect-square flex flex-col items-center justify-center gap-1.5 relative"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-2xl">{TYPE_ICON[serviceType]}</span>
              {/* Preview hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.45)' }}>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                  style={{ background: 'rgba(255,149,0,0.9)', color: '#080808' }}>
                  <Eye size={10} />
                  Preview
                </div>
              </div>
            </div>

            {/* File info */}
            <div className="px-2.5 py-2">
              <p className="text-xs font-medium text-white truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#555' }}>
                {asset.file_type}
              </p>
            </div>

            {/* Delete button */}
            {!readonly && (
              <button
                onClick={(e) => handleDelete(e, asset.id)}
                disabled={deleting === asset.id}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                title="Delete asset"
              >
                <Trash2 size={11} />
              </button>
            )}
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
