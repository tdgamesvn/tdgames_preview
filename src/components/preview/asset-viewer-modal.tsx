'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { ImageLightbox, type LightboxAsset } from '@/components/preview/image-lightbox'
import { VfxViewer } from '@/components/preview/vfx-viewer'
import { SpinePlayer } from '@/components/preview/spine-player'
import type { PrvAsset } from '@/lib/types/database'

interface AssetViewerModalProps {
  asset: PrvAsset & { presignedUrl?: string }
  allArtAssets?: (PrvAsset & { presignedUrl?: string })[]  // for lightbox navigation
  spineVersion?: string | null
  /** Locked Spine skin from project settings — passed through to SpinePlayer */
  projectDefaultSkin?: string | null
  onClose: () => void
}

async function fetchDownloadUrl(assetId: string): Promise<string> {
  const res = await fetch(`/api/assets/${assetId}/download`)
  if (!res.ok) throw new Error('Failed to get download URL')
  const { url } = await res.json()
  return url
}

export function AssetViewerModal({
  asset,
  allArtAssets = [],
  spineVersion,
  projectDefaultSkin,
  onClose,
}: AssetViewerModalProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(asset.presignedUrl ?? null)
  const [artUrls, setArtUrls] = useState<Record<string, string>>({})

  // Spine is previewable only from the skeleton (.json) and only when grouped
  // under a task (the proxy resolves files by task + name).
  const isSpineJson =
    asset.service_type === 'animation' &&
    (asset.file_type === 'json' || asset.name.endsWith('.json')) &&
    Boolean(asset.task_id)
  const spineBase = asset.name.replace(/\.[^./]+$/, '')
  const spineJsonUrl = isSpineJson
    ? `/api/spine/${asset.task_id}/${encodeURIComponent(asset.name)}`
    : ''
  const spineAtlasUrl = isSpineJson
    ? `/api/spine/${asset.task_id}/${encodeURIComponent(`${spineBase}.atlas`)}`
    : ''
  const [lightboxIndex, setLightboxIndex] = useState(
    Math.max(0, allArtAssets.findIndex((a) => a.id === asset.id))
  )
  const [loading, setLoading] = useState(!asset.presignedUrl)

  // Fetch presigned URL for the primary asset if not provided
  useEffect(() => {
    if (asset.presignedUrl) return
    setLoading(true)
    fetchDownloadUrl(asset.id)
      .then((url) => { setPresignedUrl(url); setLoading(false) })
      .catch(() => setLoading(false))
  }, [asset.id, asset.presignedUrl])

  // Pre-fetch URLs for all lightbox siblings (art mode only)
  useEffect(() => {
    if (asset.service_type !== 'art' || allArtAssets.length === 0) return
    allArtAssets.forEach((a) => {
      if (!a.presignedUrl && !artUrls[a.id]) {
        fetchDownloadUrl(a.id).then((url) =>
          setArtUrls((prev) => ({ ...prev, [a.id]: url }))
        )
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.service_type, allArtAssets])

  async function handleDownload(assetId: string) {
    // Use pre-set presigned URL if available (share page), otherwise fetch from API
    const targetAsset = assetId === asset.id ? asset : allArtAssets.find((x) => x.id === assetId)
    const url = targetAsset?.presignedUrl ?? artUrls[assetId] ?? await fetchDownloadUrl(assetId)
    const a = document.createElement('a')
    a.href = url
    a.download = targetAsset?.name ?? assetId
    a.click()
  }

  // Art lightbox mode
  if (asset.service_type === 'art' && allArtAssets.length > 0) {
    const lightboxAssets: LightboxAsset[] = allArtAssets.map((a) => ({
      id: a.id,
      name: a.name,
      presignedUrl: a.presignedUrl ?? artUrls[a.id] ?? '',
    }))

    return (
      <ImageLightbox
        assets={lightboxAssets}
        currentIndex={lightboxIndex}
        onClose={onClose}
        onNavigate={setLightboxIndex}
        onDownload={handleDownload}
      />
    )
  }

  // Full-screen modal for Spine / VFX / single Art
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="font-semibold text-white truncate">{asset.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Loading preview…
            </div>
          )}

          {asset.service_type === 'animation' && spineVersion && isSpineJson && (
            <SpinePlayer
              skeletonUrl={spineJsonUrl}
              atlasUrl={spineAtlasUrl}
              spineVersion={spineVersion}
              assetName={asset.name}
              lockedSkin={projectDefaultSkin ?? undefined}
              onDownload={() => handleDownload(asset.id)}
            />
          )}
          {!loading && asset.service_type === 'animation' && !isSpineJson && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <span className="text-3xl">🦴</span>
              <p className="text-sm text-center">
                This is a Spine support file. Open the <strong>.json</strong> skeleton to play the animation.
              </p>
              <button
                onClick={() => handleDownload(asset.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: '#FF9500', color: '#080808' }}
              >
                Download {asset.name}
              </button>
            </div>
          )}

          {!loading && presignedUrl && asset.service_type === 'vfx' && (
            <VfxViewer
              name={asset.name}
              fileType={asset.file_type}
              presignedUrl={presignedUrl}
              onDownload={() => handleDownload(asset.id)}
            />
          )}

          {!loading && asset.service_type === 'art' && (
            presignedUrl ? (
              <img
                src={presignedUrl}
                alt={asset.name}
                className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg"
              />
            ) : (
              <div className="text-gray-400 text-center py-12">Preview unavailable</div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
