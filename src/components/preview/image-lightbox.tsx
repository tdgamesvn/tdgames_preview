'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export interface LightboxAsset {
  id: string
  name: string
  presignedUrl: string
}

interface ImageLightboxProps {
  assets: LightboxAsset[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  onDownload: (assetId: string) => void
}

export function ImageLightbox({
  assets,
  currentIndex,
  onClose,
  onNavigate,
  onDownload,
}: ImageLightboxProps) {
  const current = assets[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < assets.length - 1

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-6 py-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-medium truncate max-w-lg">{current.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {currentIndex + 1} / {assets.length}
          </span>
          <button
            onClick={() => onDownload(current.id)}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <img
          src={current.presignedUrl}
          alt={current.name}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />

        {hasNext && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {assets.length > 1 && (
        <div
          className="flex gap-2 px-6 py-3 overflow-x-auto bg-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {assets.map((asset, i) => (
            <button
              key={asset.id}
              onClick={() => onNavigate(i)}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                i === currentIndex
                  ? 'border-white'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={asset.presignedUrl} alt={asset.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
