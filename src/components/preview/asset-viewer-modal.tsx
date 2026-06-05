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
  onClose,
}: AssetViewerModalProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(asset.presignedUrl ?? null)
  const [artUrls, setArtUrls] = useState<Record<string, string>>({})
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
    const url = await fetchDownloadUrl(assetId)
    const a = document.createElement('a')
    a.href = url
    a.download = assetId === asset.id ? asset.name : (allArtAssets.find((x) => x.id === assetId)?.name ?? assetId)
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

          {!loading && presignedUrl && asset.service_type === 'animation' && spineVersion && (
            <SpinePlayer
              skeletonUrl={presignedUrl}
              atlasUrl={presignedUrl.replace(/\.[^.]+$/, '.atlas')}
              animations={(asset.metadata as any)?.animations ?? []} // eslint-disable-line @typescript-eslint/no-explicit-any
              skins={(asset.metadata as any)?.skins ?? ['default']} // eslint-disable-line @typescript-eslint/no-explicit-any
              spineVersion={spineVersion}
              assetName={asset.name}
              onDownload={() => handleDownload(asset.id)}
            />
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
