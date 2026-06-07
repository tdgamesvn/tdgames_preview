'use client'

import { useState } from 'react'
import { Download, Maximize2 } from 'lucide-react'
import { ImageLightbox, type LightboxAsset } from '@/components/preview/image-lightbox'

interface ArtFilmstripProps {
  assets: LightboxAsset[]
}

export function ArtFilmstrip({ assets }: ArtFilmstripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  async function handleDownload(assetId: string) {
    const res = await fetch(`/api/assets/${assetId}/download`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  return (
    <>
      {/* Responsive grid — show full image at a glance, click to fullscreen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset, idx) => (
          <div key={asset.id} className="group relative">
            <button
              onClick={() => setLightboxIndex(idx)}
              className="block w-full rounded-2xl overflow-hidden cursor-zoom-in transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,149,0,0.4)'
                el.style.boxShadow = '0 8px 32px rgba(255,149,0,0.12)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.08)'
                el.style.boxShadow = 'none'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.presignedUrl}
                alt={asset.name}
                className="w-full h-auto block"
                style={{
                  objectFit: 'contain',
                  maxHeight: '1080px',
                  background: 'rgba(255,255,255,0.02)',
                }}
              />
            </button>

            {/* Hover actions */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setLightboxIndex(idx)}
                aria-label="Fullscreen"
                className="p-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
              >
                <Maximize2 size={12} style={{ color: '#ccc' }} />
              </button>
              <button
                onClick={() => handleDownload(asset.id)}
                aria-label="Download"
                className="p-1.5 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
              >
                <Download size={12} style={{ color: '#ccc' }} />
              </button>
            </div>

            {/* File name */}
            <p
              className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider truncate px-1"
              style={{ color: '#444' }}
              title={asset.name}
            >
              {asset.name.replace(/\.[^.]+$/, '')}
            </p>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          assets={assets}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDownload={handleDownload}
        />
      )}
    </>
  )
}
