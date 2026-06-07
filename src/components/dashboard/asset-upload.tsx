'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetUploadProps {
  projectId: string
  serviceType: ServiceType
  taskId?: string | null
  existingAssets?: PrvAsset[]
}

interface PendingConfirm {
  file: File
  match: PrvAsset
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

/** OS/system files that should never be uploaded (Windows, macOS, etc.). */
const SYSTEM_FILE_NAMES = new Set([
  'desktop.ini', 'thumbs.db', 'thumbs.db:encryptable',
  '.ds_store', '.localized', '.spotlight-v100', '.trashes',
  '.fseventsd', '.temporaryitems', '.apdisk',
])

function isSystemFile(name: string): boolean {
  const lower = name.toLowerCase()
  // Exact system file names
  if (SYSTEM_FILE_NAMES.has(lower)) return true
  // Mac resource forks (._filename) and hidden dot-files
  if (lower.startsWith('._') || lower.startsWith('.')) return true
  return false
}

function getExtension(filename: string): string {
  // Handle .atlas.txt → atlas, .skel.bytes → skel, etc.
  const parts = filename.split('.')
  if (parts.length >= 3 && ['txt', 'bytes'].includes(parts[parts.length - 1])) {
    return parts[parts.length - 2].toLowerCase()
  }
  return parts.pop()?.toLowerCase() ?? 'bin'
}

export function AssetUpload({ projectId, serviceType, taskId, existingAssets = [] }: AssetUploadProps) {
  const router   = useRouter()
  const inputRef       = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState<string | null>(null)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [pendingConfirms, setPendingConfirms] = useState<PendingConfirm[]>([])

  /** Upload a file. If `replaceAsset` is provided, sends replace_asset_id + old_r2_key. */
  async function uploadFile(file: File, replaceAsset?: PrvAsset) {
    setUploading(true)
    setDone(false)
    setError(null)

    try {
      // Resize images > 1920px before upload.
      // SKIP resize for animation assets — Spine texture PNGs must keep their
      // exact dimensions (typically POT: 2048×2048, 4096×4096). Resizing to
      // 1920px produces NPOT textures AND invalidates the UV coordinates baked
      // into the .atlas file (which still records the original size), causing
      // the Spine runtime to fail entirely.
      let processed = file
      if (serviceType !== 'animation') {
        setProgress(`Compressing ${file.name}…`)
        processed = await resizeImageIfNeeded(file)
      }
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

      if (replaceAsset) {
        formData.append('replace_asset_id', replaceAsset.id)
        formData.append('old_r2_key',       replaceAsset.r2_key)
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body:   formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed (${res.status})`)
      }

      setDone(true)
      setProgress(`${processed.name} ${replaceAsset ? 'replaced' : 'uploaded'}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => { setProgress(null); setDone(false) }, 3500)
    }
  }

  /** Recursively collect all files from a FileSystemEntry (handles folders). */
  async function collectFromEntry(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) {
      return new Promise<File[]>((resolve) => {
        (entry as FileSystemFileEntry).file(
          (f) => resolve([f]),
          () => resolve([]),
        )
      })
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        reader.readEntries(resolve, () => resolve([]))
      })
      const nested = await Promise.all(entries.map(collectFromEntry))
      return nested.flat()
    }
    return []
  }

  /** Handle drop — supports both files and folders via DataTransferItem API. */
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const items = Array.from(e.dataTransfer.items)
    const entries = items
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean) as FileSystemEntry[]

    if (entries.length === 0) {
      // Fallback: no entry API — use plain files
      return handleFiles(e.dataTransfer.files)
    }
    const allFiles = (await Promise.all(entries.map(collectFromEntry))).flat()
    await handleFilesArray(allFiles)
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    await handleFilesArray(Array.from(files))
  }

  /** For each file: if name matches an existing asset → queue confirm; else upload directly. */
  async function handleFilesArray(files: File[]) {
    if (!files?.length) return

    // Strip OS/system files (desktop.ini, .DS_Store, ._*, …) before any processing
    const filtered = files.filter((f) => !isSystemFile(f.name))
    if (!filtered.length) return

    const newConfirms: PendingConfirm[] = []
    const directUploads: File[] = []

    for (const file of Array.from(filtered)) {
      const match = existingAssets.find(
        (a) => a.name.toLowerCase() === file.name.toLowerCase(),
      )
      if (match) {
        newConfirms.push({ file, match })
      } else {
        directUploads.push(file)
      }
    }

    if (newConfirms.length > 0) {
      setPendingConfirms((prev) => [...prev, ...newConfirms])
    }

    for (const file of directUploads) {
      await uploadFile(file)
    }
  }

  function dismissConfirm(file: File) {
    setPendingConfirms((prev) => prev.filter((c) => c.file !== file))
  }

  async function handleReplace(confirm: PendingConfirm) {
    dismissConfirm(confirm.file)
    await uploadFile(confirm.file, confirm.match)
  }

  async function handleAddNew(confirm: PendingConfirm) {
    dismissConfirm(confirm.file)
    await uploadFile(confirm.file)
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
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
            {serviceType === 'animation' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click() }}
                className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(255,149,0,0.08)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.2)' }}
              >
                📁 Or pick folder (JSON + atlas + textures)
              </button>
            )}
          </>
        )}
      </div>

      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />
      {/* Folder picker — animation tab only */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Inline replace confirm chips */}
      {pendingConfirms.map(({ file, match }) => (
        <div
          key={file.name}
          className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
          style={{
            background: 'rgba(245,158,11,0.07)',
            border:     '1px solid rgba(245,158,11,0.22)',
          }}
        >
          <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#F0F0F0' }}>
              <span style={{ color: '#F59E0B' }}>{file.name}</span> already exists
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              Replace the existing file or add it as a new asset?
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReplace({ file, match })}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(255,149,0,0.15)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.3)' }}
              >
                Replace
              </button>
              <button
                onClick={() => handleAddNew({ file, match })}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Add new
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Error banner */}
      {error && (
        <div className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
          {error}
        </div>
      )}
    </div>
  )
}
