'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
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
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {assets.map((asset, idx) => (
          <div
            key={asset.id}
            style={{ scrollSnapAlign: 'start', flexShrink: 0, position: 'relative' }}
            className="group"
          >
            <button
              onClick={() => setLightboxIndex(idx)}
              style={{
                display: 'block',
                width: '120px',
                height: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                background: '#0a0a0a',
                cursor: 'pointer',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,149,0,0.4)'
                el.style.boxShadow = '0 4px 20px rgba(255,149,0,0.12)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.boxShadow = 'none'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.presignedUrl}
                alt={asset.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
            {/* Download on hover */}
            <button
              onClick={() => handleDownload(asset.id)}
              aria-label="Download"
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            >
              <Download size={10} style={{ color: '#888' }} />
            </button>
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
