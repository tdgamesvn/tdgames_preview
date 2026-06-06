'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Eye, Download } from 'lucide-react'
import { AssetViewerModal } from '@/components/preview/asset-viewer-modal'
import { SpineAnimationGallery } from '@/components/dashboard/spine-animation-gallery'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

function stripExt(name: string): string {
  return name.replace(/\.[^./]+$/, '')
}

async function downloadAsset(assetId: string, name: string) {
  const res = await fetch(`/api/assets/${assetId}/download`)
  if (!res.ok) return
  const { url } = await res.json()
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

interface AssetGridClientProps {
  assets: PrvAsset[]
  serviceType: ServiceType
  spineVersion?: string | null
  projectId: string
  readonly?: boolean
  presignedUrls?: Record<string, string>  // art thumbnails, pre-generated server-side
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
  presignedUrls = {},
}: AssetGridClientProps) {
  const router = useRouter()
  const [viewingAsset, setViewingAsset] = useState<PrvAsset | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (!assets.length) {
    if (readonly) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <span className="text-3xl opacity-20">{TYPE_ICON[serviceType]}</span>
          <p className="text-xs" style={{ color: '#444' }}>No assets yet — check back soon.</p>
        </div>
      )
    }
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

  // Animation tab: show the playable Spine inline instead of the raw json/png/
  // atlas files. Group files by base name; each set with a .json is one player.
  if (serviceType === 'animation' && spineVersion) {
    const jsonSets = assets.filter(
      a => (a.file_type === 'json' || a.name.endsWith('.json')) && a.task_id
    )
    if (jsonSets.length > 0) {
      return (
        <div className="space-y-8">
          {jsonSets.map(json => {
            const base = stripExt(json.name)
            const setFiles = assets.filter(a => stripExt(a.name) === base)
            return (
              <div key={json.id} className="space-y-2">
                <SpineAnimationGallery
                  taskId={json.task_id!}
                  jsonName={json.name}
                  atlasName={`${base}.atlas`}
                  spineVersion={spineVersion}
                />
                <details className="text-xs" style={{ color: '#666' }}>
                  <summary className="cursor-pointer select-none py-1 hover:text-white transition-colors">
                    Source files ({setFiles.length})
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {setFiles.map(f => (
                      <div key={f.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="text-white">{f.name}</span>
                        <button onClick={() => downloadAsset(f.id, f.name)}
                          className="text-neutral-400 hover:text-[#FF9500]" title="Download">
                          <Download size={12} />
                        </button>
                        {!readonly && (
                          <button onClick={(e) => handleDelete(e, f.id)} disabled={deleting === f.id}
                            className="text-neutral-400 hover:text-red-400" title="Delete">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {assets.map((asset) => {
          const thumbUrl = presignedUrls[asset.id] ?? ''
          return (
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
                ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,149,0,0.35)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,149,0,0.04)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
              }}
            >
              {/* Thumbnail */}
              <div className="aspect-square relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                {thumbUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumbUrl} alt={asset.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">{TYPE_ICON[serviceType]}</span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
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

              {/* Delete */}
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
          )
        })}
      </div>

      {viewingAsset && (
        <AssetViewerModal
          asset={{ ...viewingAsset, presignedUrl: presignedUrls[viewingAsset.id] }}
          allArtAssets={
            serviceType === 'art'
              ? assets.map(a => ({ ...a, presignedUrl: presignedUrls[a.id] }))
              : []
          }
          spineVersion={spineVersion}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </>
  )
}
