'use client'

import { useRef, useEffect } from 'react'
import { Download, Package } from 'lucide-react'

export interface VfxCardData {
  id: string
  name: string
  fileType: string
  presignedUrl: string
}

async function downloadVfx(assetId: string, name: string) {
  const res = await fetch(`/api/assets/${assetId}/download`)
  if (!res.ok) return
  const { url } = await res.json()
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

// ── Video card with IntersectionObserver play/pause ──────────────────────────
function VideoCard({ asset }: { asset: VfxCardData }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          video.play().catch(() => { /* autoplay blocked — ignore */ })
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="group relative rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }}>
      <video
        ref={videoRef}
        src={asset.presignedUrl}
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-auto block"
        style={{ maxHeight: '480px', objectFit: 'contain' }}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => downloadVfx(asset.id, asset.name)}
          aria-label="Download"
          className="p-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <Download size={12} style={{ color: '#ccc' }} />
        </button>
      </div>
      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: '#444' }}>
        {asset.name.replace(/\.[^.]+$/, '')}
      </p>
    </div>
  )
}

// ── GIF card ─────────────────────────────────────────────────────────────────
function GifCard({ asset }: { asset: VfxCardData }) {
  return (
    <div className="group relative rounded-2xl overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.presignedUrl}
        alt={asset.name}
        className="w-full h-auto block"
        style={{ maxHeight: '480px', objectFit: 'contain' }}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => downloadVfx(asset.id, asset.name)}
          aria-label="Download"
          className="p-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <Download size={12} style={{ color: '#ccc' }} />
        </button>
      </div>
      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: '#444' }}>
        {asset.name.replace(/\.[^.]+$/, '')}
      </p>
    </div>
  )
}

// ── Unity / unknown — download only ──────────────────────────────────────────
function PackageCard({ asset }: { asset: VfxCardData }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center gap-3 py-10"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Package size={32} style={{ color: '#444' }} />
      <p className="text-xs font-semibold text-white text-center px-4 truncate max-w-full">{asset.name}</p>
      <button
        onClick={() => downloadVfx(asset.id, asset.name)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
        style={{ background: 'rgba(255,149,0,0.1)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.25)' }}
      >
        <Download size={11} />
        Download
      </button>
    </div>
  )
}

// ── Main grid ─────────────────────────────────────────────────────────────────
interface VfxInlineGridProps {
  assets: VfxCardData[]
}

export function VfxInlineGrid({ assets }: VfxInlineGridProps) {
  if (assets.length === 0) return null

  return (
    <div className={`grid gap-4 ${assets.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {assets.map(asset => {
        const ft = (asset.fileType ?? '').toLowerCase()
        const name = asset.name.toLowerCase()
        const isVideo = ft === 'mp4' || ft === 'webm' || name.endsWith('.mp4') || name.endsWith('.webm')
        const isGif   = ft === 'gif'  || name.endsWith('.gif')

        if (isVideo) return <VideoCard key={asset.id} asset={asset} />
        if (isGif)   return <GifCard   key={asset.id} asset={asset} />
        return           <PackageCard key={asset.id} asset={asset} />
      })}
    </div>
  )
}
