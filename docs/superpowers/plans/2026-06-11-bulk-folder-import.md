# Bulk Folder Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let internal users drop 30–50 character folders at once; each folder becomes a character (Prv_task) and its Spine files are uploaded as `animation` assets automatically.

**Architecture:** Extract shared file utilities from `asset-upload.tsx` into `src/lib/utils/files.ts`, then build a `BulkFolderImport` component that uses `createTasksBatch` + `POST /api/upload` (both existing) to create tasks and upload files in sequence. Wire the component into the Characters tab of the project detail page.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Supabase (server actions), Cloudflare R2 (`/api/upload`), FileSystem Access API (`webkitGetAsEntry`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/utils/files.ts` | **Create** | `isSystemFile`, `getExtension`, `collectFromEntry` — shared across upload components |
| `src/components/dashboard/asset-upload.tsx` | **Modify** | Import utilities from `@/lib/utils/files` instead of defining them inline |
| `src/components/dashboard/bulk-folder-import.tsx` | **Create** | Full bulk import UI: idle → preview → uploading → done |
| `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx` | **Modify** | Add `<BulkFolderImport>` to Characters tab below `<TaskManager>` |
| `__tests__/lib/utils/files.test.ts` | **Create** | Unit tests for `isSystemFile` and `getExtension` |

---

## Task 1: Shared File Utilities

**Files:**
- Create: `src/lib/utils/files.ts`
- Create: `__tests__/lib/utils/files.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/utils/files.test.ts`:

```typescript
import { isSystemFile, getExtension } from '@/lib/utils/files'

describe('isSystemFile', () => {
  it('returns true for .DS_Store', () => {
    expect(isSystemFile('.DS_Store')).toBe(true)
  })
  it('returns true for desktop.ini (case-insensitive)', () => {
    expect(isSystemFile('Desktop.INI')).toBe(true)
  })
  it('returns true for Mac resource forks (._filename)', () => {
    expect(isSystemFile('._Knight.json')).toBe(true)
  })
  it('returns true for thumbs.db', () => {
    expect(isSystemFile('Thumbs.db')).toBe(true)
  })
  it('returns false for normal files', () => {
    expect(isSystemFile('Knight.json')).toBe(false)
    expect(isSystemFile('Knight.atlas')).toBe(false)
    expect(isSystemFile('Knight.png')).toBe(false)
  })
})

describe('getExtension', () => {
  it('returns simple extension', () => {
    expect(getExtension('Knight.json')).toBe('json')
    expect(getExtension('Knight.png')).toBe('png')
  })
  it('handles .atlas.txt → atlas', () => {
    expect(getExtension('Knight.atlas.txt')).toBe('atlas')
  })
  it('handles .skel.bytes → skel', () => {
    expect(getExtension('Knight.skel.bytes')).toBe('skel')
  })
  it('returns bin for files with no extension', () => {
    expect(getExtension('noextension')).toBe('bin')
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npx jest __tests__/lib/utils/files.test.ts --no-coverage
```

Expected: `Cannot find module '@/lib/utils/files'`

- [ ] **Step 3: Create `src/lib/utils/files.ts`**

```typescript
/** OS/system files that should never be uploaded (Windows, macOS, etc.). */
const SYSTEM_FILE_NAMES = new Set([
  'desktop.ini', 'thumbs.db', 'thumbs.db:encryptable',
  '.ds_store', '.localized', '.spotlight-v100', '.trashes',
  '.fseventsd', '.temporaryitems', '.apdisk',
])

/** Returns true for OS/system files that should never be uploaded. */
export function isSystemFile(name: string): boolean {
  const lower = name.toLowerCase()
  if (SYSTEM_FILE_NAMES.has(lower)) return true
  // Mac resource forks (._filename) and hidden dot-files
  if (lower.startsWith('._') || lower.startsWith('.')) return true
  return false
}

/** Extracts the logical file extension.
 *  Handles compound extensions: .atlas.txt → atlas, .skel.bytes → skel. */
export function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length >= 3 && ['txt', 'bytes'].includes(parts[parts.length - 1])) {
    return parts[parts.length - 2].toLowerCase()
  }
  return parts.pop()?.toLowerCase() ?? 'bin'
}

/** Recursively collects all File objects from a FileSystemEntry (file or directory). */
export async function collectFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      ;(entry as FileSystemFileEntry).file(
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
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npx jest __tests__/lib/utils/files.test.ts --no-coverage
```

Expected: `Tests: 9 passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/files.ts __tests__/lib/utils/files.test.ts
git commit -m "feat: extract shared file utilities (isSystemFile, getExtension, collectFromEntry)"
```

---

## Task 2: Update AssetUpload to Use Shared Utils

**Files:**
- Modify: `src/components/dashboard/asset-upload.tsx`

The three functions `isSystemFile`, `getExtension`, `collectFromEntry` are currently defined inline in this file. Replace them with imports from `@/lib/utils/files`.

- [ ] **Step 1: Open `src/components/dashboard/asset-upload.tsx` and make these changes**

**Remove** lines 71–93 (the three function definitions — `SYSTEM_FILE_NAMES`, `isSystemFile`, `getExtension`) and lines 170–189 (`collectFromEntry` function).

**Add** this import at the top, alongside the existing imports:

```typescript
import { isSystemFile, getExtension, collectFromEntry } from '@/lib/utils/files'
```

The rest of the file stays exactly the same — the function names are identical so all call sites continue to work.

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
npx jest --no-coverage
```

Expected: all tests pass (same count as before).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/asset-upload.tsx
git commit -m "refactor: asset-upload imports file utils from shared module"
```

---

## Task 3: BulkFolderImport Component

**Files:**
- Create: `src/components/dashboard/bulk-folder-import.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/bulk-folder-import.tsx`:

```typescript
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
  const [summary, setSummary] = useState({ chars: 0, files: 0 })
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

    // Group by first segment of webkitRelativePath (= folder name)
    const map = new Map<string, File[]>()
    Array.from(fileList).forEach((f) => {
      if (isSystemFile(f.name)) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const folderName = (f as any).webkitRelativePath?.split('/')[0] ?? 'Unknown'
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
      const task = tasks[i]

      for (const file of folder.files) {
        setProgress((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, current: file.name } : r)),
        )

        try {
          const ext = getExtension(file.name)
          const uniqueKey = `assets/${projectId}/${Date.now()}-${file.name}`
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
          break // skip remaining files for this character, continue to next
        }
      }
    }

    setSummary({ chars: folders.length, files: totalFiles })
    setPhase('done')
    router.refresh()
  }

  function reset() {
    setPhase('idle')
    setFolders([])
    setProgress([])
    setBatchError(null)
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
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

  // ── Preview ──────────────────────────────────────────────────────────────────
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
          <button onClick={reset} style={{ color: '#555' }}>
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
            onClick={handleImport}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#FF9500', color: '#080808' }}
          >
            Import {folders.length} character{folders.length !== 1 ? 's' : ''}
          </button>
          <button
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

  // ── Uploading ────────────────────────────────────────────────────────────────
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

  // ── Done ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl flex items-center justify-between px-4 py-3"
      style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 size={16} style={{ color: '#22C55E' }} />
        <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>
          {summary.chars} character{summary.chars !== 1 ? 's' : ''} imported · {summary.files} files uploaded
        </p>
      </div>
      <button onClick={reset} className="text-xs font-medium" style={{ color: '#555' }}>
        Import more
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run lint to catch any TypeScript errors**

```bash
npm run lint 2>&1 | grep -E "Error|error" | head -20
```

Expected: no new errors (existing `<img>` warnings are pre-existing).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/bulk-folder-import.tsx
git commit -m "feat: add BulkFolderImport component (idle/preview/uploading/done states)"
```

---

## Task 4: Wire into Project Detail Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`

- [ ] **Step 1: Add the import**

Open `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`.

Find the existing import block near the top and add:

```typescript
import { BulkFolderImport } from '@/components/dashboard/bulk-folder-import'
```

- [ ] **Step 2: Add the component to the Characters tab**

Find the Characters tab content (around line 95–100):

```tsx
        {/* ── Characters tab ──────────────────────────── */}
        <TabsContent value="characters">
          <div className="space-y-6">
            {/* Add character button */}
            <TaskManager projectId={project.id} clientId={params.id} />
```

Add `<BulkFolderImport>` immediately after `<TaskManager>`:

```tsx
        {/* ── Characters tab ──────────────────────────── */}
        <TabsContent value="characters">
          <div className="space-y-6">
            {/* Add character button */}
            <TaskManager projectId={project.id} clientId={params.id} />

            {/* Bulk folder import */}
            <BulkFolderImport projectId={project.id} clientId={params.id} />
```

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | grep -E "^\./" | grep -v "Warning"
```

Expected: no new errors.

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass (count ≥ 42 from before + 9 new utils tests).

- [ ] **Step 5: Commit and push**

```bash
git add src/app/\(dashboard\)/dashboard/clients/\[id\]/projects/\[pid\]/page.tsx
git commit -m "feat: wire BulkFolderImport into Characters tab"
git push origin main
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Drop zone accepting multiple folders → Task 3 (`readDroppedFolders` via DataTransferItem API)
- ✅ Folder picker button fallback → Task 3 (`handleFolderPicker` + `webkitdirectory` input)
- ✅ Folder name = character name → Task 3 (`entries.map(e => e.name)`)
- ✅ Files inside = animation assets → Task 3 (`service_type: 'animation'` in formData)
- ✅ System file filtering → Task 1 (`isSystemFile`) + Task 3 (applied in `readDroppedFolders`)
- ✅ Preview state showing detected folders → Task 3 (preview phase UI)
- ✅ Sequential upload per character → Task 3 (sequential `for` loops)
- ✅ Per-character error handling → Task 3 (`error` field in `ProgressRow`, `break` on error)
- ✅ Empty folders filtered → Task 3 (`valid = folderDataList.filter(f => f.files.length > 0)`)
- ✅ `createTasksBatch` reused → Task 3 (imported directly)
- ✅ `/api/upload` reused → Task 3 (`fetch('/api/upload', ...)`)
- ✅ `router.refresh()` after done → Task 3
- ✅ Shared utilities extracted → Task 1
- ✅ `asset-upload.tsx` updated to use shared utils → Task 2
- ✅ Wired into Characters tab → Task 4

**No placeholders found.**

**Type consistency:** `PrvTask` used in Task 3 (`result.data!` typed as `PrvTask[]`), imported from `@/lib/types/database` — consistent with existing codebase pattern.
