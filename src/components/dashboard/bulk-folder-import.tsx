'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, CheckCircle2, X } from 'lucide-react'
import { createTasksBatch } from '@/lib/actions/tasks'
import { isSystemFile, getExtension, collectFromEntry } from '@/lib/utils/files'
import type { PrvTask } from '@/lib/types/database'

interface BulkFolderImportProps {
  projectId: string
  clientId: string
}

interface FolderData {
  name: string
  files: File[]
}

interface ProgressRow {
  name: string
  done: number
  total: number
  current: string
  error?: string
}

type Phase = 'idle' | 'preview' | 'uploading' | 'done'

export function BulkFolderImport({ projectId, clientId }: BulkFolderImportProps) {
  const router = useRouter()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [folders, setFolders] = useState<FolderData[]>([])
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [summary, setSummary] = useState<{
    chars: number
    files: number
    errors: { name: string; reason: string }[]
  }>({ chars: 0, files: 0, errors: [] })
  const [batchError, setBatchError] = useState<string | null>(null)

  async function readDroppedFolders(items: DataTransferItemList): Promise<void> {
    const entries = Array.from(items)
      .map((i) => i.webkitGetAsEntry?.())
      .filter((e): e is FileSystemEntry => !!e && e.isDirectory)

    if (entries.length === 0) return

    const folderDataList = await Promise.all(
      entries.map(async (entry) => {
        const allFiles = await collectFromEntry(entry)
        const files = allFiles.filter((f) => !isSystemFile(f.name))
        return { name: entry.name, files }
      }),
    )

    const valid = folderDataList.filter((f) => f.files.length > 0)
    if (!valid.length) return
    setFolders(valid)
    setPhase('preview')
  }

  async function handleFolderPicker(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const fileList = e.target.files
    if (!fileList?.length) return
    e.target.value = ''

    const map = new Map<string, File[]>()
    Array.from(fileList).forEach((f) => {
      if (isSystemFile(f.name)) return
      const folderName = (f as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] ?? 'Unknown'
      if (!map.has(folderName)) map.set(folderName, [])
      map.get(folderName)!.push(f)
    })

    const valid = Array.from(map.entries())
      .map(([name, files]) => ({ name, files }))
      .filter((f) => f.files.length > 0)

    if (!valid.length) return
    setFolders(valid)
    setPhase('preview')
  }

  async function handleImport(): Promise<void> {
    if (!folders.length) return
    setPhase('uploading')
    setBatchError(null)

    const names = folders.map((f) => f.name)
    const result = await createTasksBatch({ project_id: projectId, client_id: clientId, names })
    if (result.error) {
      setBatchError(result.error)
      setPhase('preview')
      return
    }

    const tasks: PrvTask[] = result.data!
    const taskMap = new Map(tasks.map((t) => [t.name, t]))
    const rows: ProgressRow[] = folders.map((f) => ({
      name: f.name,
      done: 0,
      total: f.files.length,
      current: '',
    }))
    setProgress(rows)

    let totalFiles = 0

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]
      const task = taskMap.get(folder.name)
      if (!task) {
        setProgress((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, error: 'Task not found' } : r)),
        )
        continue
      }

      for (const file of folder.files) {
        setProgress((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, current: file.name } : r)),
        )

        try {
          const ext = getExtension(file.name)
          const uniqueKey = `assets/${projectId}/${crypto.randomUUID()}-${file.name}`
          const formData = new FormData()
          formData.append('file', file)
          formData.append('project_id', projectId)
          formData.append('service_type', 'animation')
          formData.append('r2_key', uniqueKey)
          formData.append('name', file.name)
          formData.append('file_type', ext)
          formData.append('task_id', task.id)

          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error ?? `Upload failed (${res.status})`)
          }

          totalFiles++
          setProgress((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, done: r.done + 1 } : r)),
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setProgress((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, error: msg } : r)),
          )
          break
        }
      }
    }

    const errorRows = rows
      .filter((r) => r.error)
      .map((r) => ({ name: r.name, reason: r.error! }))
    const successCount = folders.length - errorRows.length
    setSummary({ chars: successCount, files: totalFiles, errors: errorRows })
    setPhase('done')
    router.refresh()
  }

  function reset() {
    setPhase('idle')
    setFolders([])
    setProgress([])
    setBatchError(null)
    setSummary({ chars: 0, files: 0, errors: [] })
  }

  if (phase === 'idle') {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); readDroppedFolders(e.dataTransfer.items) }}
        className="rounded-2xl transition-all"
        style={{
          padding: '20px 24px',
          textAlign: 'center',
          border: dragging
            ? '1.5px dashed rgba(255,149,0,0.6)'
            : '1.5px dashed rgba(255,255,255,0.08)',
          background: dragging ? 'rgba(255,149,0,0.04)' : 'rgba(255,255,255,0.01)',
        }}
      >
        <FolderOpen
          size={20}
          className="mx-auto mb-2"
          style={{ color: dragging ? '#FF9500' : '#444' }}
        />
        <p className="text-sm font-semibold" style={{ color: dragging ? '#FF9500' : '#666' }}>
          {dragging ? 'Release to detect characters' : 'Drop character folders here'}
        </p>
        <p className="text-xs mt-1" style={{ color: '#333' }}>
          Each folder = 1 character · Spine files uploaded as animation assets
        </p>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: 'rgba(255,149,0,0.08)',
            color: '#FF9500',
            border: '1px solid rgba(255,149,0,0.18)',
          }}
        >
          📁 Or pick folders
        </button>
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFolderPicker}
        />
      </div>
    )
  }

  if (phase === 'preview') {
    const totalFiles = folders.reduce((s, f) => s + f.files.length, 0)
    return (
      <div
        className="rounded-2xl space-y-3"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          padding: '16px',
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-white">
            {folders.length} character{folders.length !== 1 ? 's' : ''} · {totalFiles} files detected
          </p>
          <button type="button" aria-label="Cancel import" onClick={reset} style={{ color: '#555' }}>
            <X size={14} />
          </button>
        </div>

        {batchError && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444',
            }}
          >
            {batchError}
          </p>
        )}

        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {folders.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-xs font-medium text-white truncate">{f.name}</span>
              <span className="text-[10px] ml-3 flex-shrink-0" style={{ color: '#555' }}>
                {f.files.length} file{f.files.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#FF9500', color: '#080808' }}
          >
            Import {folders.length} character{folders.length !== 1 ? 's' : ''}
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#666',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'uploading') {
    return (
      <div
        className="rounded-2xl space-y-2"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          padding: '16px',
        }}
      >
        <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#888' }}>
          Importing…
        </p>
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {progress.map((row) => (
            <div
              key={row.name}
              className="px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white truncate">{row.name}</span>
                <span
                  className="text-[10px] ml-3 flex-shrink-0"
                  style={{ color: row.error ? '#EF4444' : '#555' }}
                >
                  {row.error ? '✗ error' : `${row.done}/${row.total}`}
                </span>
              </div>
              {!row.error && row.current && row.done < row.total && (
                <p className="text-[10px] mt-0.5 truncate" style={{ color: '#444' }}>
                  {row.current}
                </p>
              )}
              {row.error && (
                <p className="text-[10px] mt-0.5 truncate" style={{ color: '#EF4444' }}>
                  {row.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasErrors = summary.errors.length > 0
  const hasSuccess = summary.chars > 0

  return (
    <div className="rounded-2xl space-y-2" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '16px' }}>
      {/* Success row */}
      {hasSuccess && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} style={{ color: '#22C55E', flexShrink: 0 }} />
            <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>
              {summary.chars} character{summary.chars !== 1 ? 's' : ''} imported · {summary.files} files uploaded
            </p>
          </div>
          {!hasErrors && (
            <button type="button" onClick={reset} className="text-xs font-medium" style={{ color: '#555' }}>
              Import more
            </button>
          )}
        </div>
      )}

      {/* Error list */}
      {hasErrors && (
        <div
          className="rounded-xl space-y-1 p-3"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
        >
          <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#EF4444' }}>
            {summary.errors.length} folder{summary.errors.length !== 1 ? 's' : ''} failed
          </p>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {summary.errors.map((e) => (
              <div key={e.name} className="flex items-start gap-2">
                <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }}>✗</span>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white truncate block">{e.name}</span>
                  <span className="text-[10px] truncate block" style={{ color: '#EF4444' }}>{e.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      {(!hasSuccess || hasErrors) && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.2)' }}
          >
            Import more
          </button>
        </div>
      )}
    </div>
  )
}
