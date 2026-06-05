'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ServiceType } from '@/lib/types/database'

interface AssetUploadProps {
  projectId: string
  serviceType: ServiceType
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'bin'
}

export function AssetUpload({ projectId, serviceType }: AssetUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setError(null)
    setProgress(`Preparing ${file.name}…`)

    try {
      const ext = getExtension(file.name)
      const uniqueKey = `assets/${projectId}/${Date.now()}-${file.name}`

      // 1. Get presigned PUT URL
      setProgress('Getting upload URL…')
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: uniqueKey,
          contentType: file.type || 'application/octet-stream',
        }),
      })
      if (!presignRes.ok) throw new Error('Failed to get upload URL')
      const { url } = await presignRes.json()

      // 2. Upload directly to R2
      setProgress(`Uploading ${file.name}…`)
      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      if (!uploadRes.ok) throw new Error('R2 upload failed')

      // 3. Save asset record to Supabase
      setProgress('Saving record…')
      const saveRes = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          service_type: serviceType,
          name: file.name,
          r2_key: uniqueKey,
          file_type: ext,
          metadata: {},
        }),
      })
      if (!saveRes.ok) throw new Error('Failed to save asset record')

      setProgress(`✓ ${file.name} uploaded`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <p className="text-sm text-gray-600">
          {uploading ? progress : 'Drop files here or click to browse'}
        </p>
        {!uploading && (
          <p className="text-xs text-gray-400 mt-1">
            {serviceType === 'art' && 'PNG, JPG, PSD'}
            {serviceType === 'animation' && 'Spine JSON, .skel, .atlas, textures'}
            {serviceType === 'vfx' && 'GIF, MP4, WebM, Unity Package'}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {progress && !error && (
        <p className="text-sm text-green-600">{progress}</p>
      )}
    </div>
  )
}
