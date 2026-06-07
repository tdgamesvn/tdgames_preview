'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle2, Loader2 } from 'lucide-react'
import type { ServiceType } from '@/lib/types/database'

interface AssetUploadProps {
  projectId: string
  serviceType: ServiceType
  taskId?: string | null
}

const acceptHint: Record<ServiceType, string> = {
  art:       'PNG · JPG · PSD',
  animation: 'Spine JSON · .atlas · textures',
  vfx:       'GIF · MP4 · WebM · Unity Package',
}

/** Resize image so its longest side ≤ MAX_PX. Returns original file if not an
 *  image, already small enough, or if the format can't be decoded (PSD, GIF…). */
const MAX_PX = 1920

async function resizeImageIfNeeded(file: File): Promise<File> {
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
  if (!IMAGE_TYPES.includes(file.type)) return file          // non-image — skip

  return new Promise<File>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      if (w <= MAX_PX && h <= MAX_PX) { resolve(file); return } // already small

      const ratio  = Math.min(MAX_PX / w, MAX_PX / h)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Preserve format: PNG keeps alpha, others → JPEG for smaller size
      const mimeOut   = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality   = mimeOut === 'image/jpeg' ? 0.88 : undefined
      const extOut    = mimeOut === 'image/png'  ? 'png' : 'jpg'
      const baseName  = file.name.replace(/\.[^.]+$/, '')
      const newName   = `${baseName}.${extOut}`

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }                 // fallback: original
          resolve(new File([blob], newName, { type: mimeOut }))
        },
        mimeOut,
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) } // decode failed
    img.src = url
  })
}

function getExtension(filename: string): string {
  // Handle .atlas.txt → atlas, .skel.bytes → skel, etc.
  const parts = filename.split('.')
  if (parts.length >= 3 && ['txt', 'bytes'].includes(parts[parts.length - 1])) {
    return parts[parts.length - 2].toLowerCase()
  }
  return parts.pop()?.toLowerCase() ?? 'bin'
}

export function AssetUpload({ projectId, serviceType, taskId }: AssetUploadProps) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState<string | null>(null)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setDone(false)
    setError(null)

    try {
      // Resize images > 1920px before upload
      setProgress(`Compressing ${file.name}…`)
      const processed = await resizeImageIfNeeded(file)
      if (processed !== file) {
        const origKB = Math.round(file.size / 1024)
        const newKB  = Math.round(processed.size / 1024)
        setProgress(`Uploading ${processed.name} (${origKB}KB → ${newKB}KB)…`)
      } else {
        setProgress(`Uploading ${file.name}…`)
      }

      const ext       = getExtension(processed.name)
      const uniqueKey = `assets/${projectId}/${Date.now()}-${processed.name}`

      const formData = new FormData()
      formData.append('file',         processed)
      formData.append('project_id',   projectId)
      formData.append('service_type', serviceType)
      formData.append('r2_key',       uniqueKey)
      formData.append('name',         processed.name)
      formData.append('file_type',    ext)
      formData.append('task_id',      taskId ?? 'null')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body:   formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Upload failed (" + res.status + ")")
      }

      setDone(true)
      setProgress(`${processed.name} uploaded`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => { setProgress(null); setDone(false) }, 3500)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative rounded-2xl transition-all cursor-pointer select-none"
        style={{
          padding: '28px 24px',
          textAlign: 'center',
          border:     dragging ? '1.5px dashed rgba(255,149,0,0.6)' : '1.5px dashed rgba(255,255,255,0.1)',
          background: dragging ? 'rgba(255,149,0,0.05)' : 'rgba(255,255,255,0.02)',
          boxShadow:  dragging ? '0 0 20px rgba(255,149,0,0.1)' : 'none',
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {uploading ? (
            <Loader2 size={18} className="animate-spin" style={{ color: '#FF9500' }} />
          ) : done ? (
            <CheckCircle2 size={18} style={{ color: '#22C55E' }} />
          ) : (
            <Upload size={18} style={{ color: dragging ? '#FF9500' : '#555' }} />
          )}
        </div>

        {uploading ? (
          <p className="text-sm font-medium" style={{ color: '#888' }}>{progress}</p>
        ) : done ? (
          <p className="text-sm font-medium" style={{ color: '#22C55E' }}>{progress}</p>
        ) : (
          <>
            <p className="text-sm font-medium" style={{ color: dragging ? '#FF9500' : '#888' }}>
              {dragging ? 'Release to upload' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#444' }}>{acceptHint[serviceType]}</p>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />

      {error && (
        <div className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          {error}
        </div>
      )}
    </div>
  )
}
