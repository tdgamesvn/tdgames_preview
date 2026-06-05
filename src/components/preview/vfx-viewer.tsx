'use client'

import { Download, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VfxViewerProps {
  name: string
  fileType: string
  presignedUrl: string
  onDownload: () => void
}

export function VfxViewer({ name, fileType, presignedUrl, onDownload }: VfxViewerProps) {
  const isVideo = fileType === 'mp4' || fileType === 'webm'
  const isGif = fileType === 'gif'
  const isUnity = fileType === 'unitypackage'

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-xl min-h-[300px] justify-center">
      {isGif && (
        <img
          src={presignedUrl}
          alt={name}
          className="max-h-[60vh] max-w-full rounded-lg object-contain"
        />
      )}

      {isVideo && (
        <video
          src={presignedUrl}
          controls
          loop
          autoPlay
          className="max-h-[60vh] max-w-full rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      )}

      {isUnity && (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Package size={64} className="text-gray-500" />
          <p className="font-medium text-white">{name}</p>
          <p className="text-sm">Unity Package — preview not available</p>
        </div>
      )}

      {!isGif && !isVideo && !isUnity && (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <p className="font-medium text-white">{name}</p>
          <p className="text-sm">.{fileType} — preview not available</p>
        </div>
      )}

      <Button
        onClick={onDownload}
        variant="outline"
        className="mt-2 gap-2 text-white border-gray-600 hover:bg-gray-700"
      >
        <Download size={16} />
        Download {name}
      </Button>
    </div>
  )
}
