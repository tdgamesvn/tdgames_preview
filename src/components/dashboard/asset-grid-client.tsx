'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Eye, Download } from 'lucide-react'
import { AssetViewerModal } from '@/components/preview/asset-viewer-modal'
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
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
  /** Locked skin from project settings — forwarded to SpinePlayer via AssetViewerModal */
  projectDefaultSkin?: string | null
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
  cardBgType,
  cardBgValue,
  projectDefaultSkin,
}: AssetGridClientProps) {
  const router = useRouter()
  const [viewingAsset, setViewingAsset] = useState<PrvAsset | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

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

  async function handleDeleteAll(e: React.MouseEvent, files: PrvAsset[]) {
    e.stopPropagation()
    if (!confirm(`Delete all ${files.length} source files?`)) return
    setDeletingAll(true)
    await Promise.all(files.map(f => fetch(`/api/assets/${f.id}`, { method: 'DELETE' })))
    setDeletingAll(false)
    router.refresh()
  }

  // Animation tab: show source files only (Change 1 — SpineAnimationGallery removed).
  // Group by base name so .json / .atlas / .png appear together.
  if (serviceType === 'animation' && spineVersion) {
    const jsonSets = assets.filter(
      a => (a.file_type === 'json' || a.name.endsWith('.json')) && a.task_id
    )
    if (jsonSets.length > 0) {
      return (
        <div className="space-y-4">
          {jsonSets.map(json => {
            const base = stripExt(json.name)
            const setFiles = assets.filter(a => stripExt(a.name) === base)
            return (
              <div key={json.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#666' }}>
                    Source files ({setFiles.length})
                  </span>
                  {!readonly && setFiles.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteAll(e, setFiles)}
                      disabled={deletingAll}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
                    >
                      <Trash2 size={11} />
                      {deletingAll ? 'Deleting…' : 'Delete all'}
                    </button>
                  )}
                </div>
                {/* File rows */}
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {setFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="text-white text-sm font-medium flex-1 truncate" title={f.name}>{f.name}</span>
                      <button onClick={() => downloadAsset(f.id, f.name)}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-[#FF9500] transition-colors" title="Download">
                        <Download size={14} />
                      </button>
                      {!readonly && (
                        <button onClick={(e) => handleDelete(e, f.id)} disabled={deleting === f.id}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-40" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
          projectDefaultSkin={projectDefaultSkin}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </>
  )
}
