# Asset Replace on Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When uploading a file whose name matches an existing asset, show an inline confirm UI letting the user choose "Replace" (update DB record + delete old R2 object) or "Add new" (current behaviour).

**Architecture:** Three-layer change. (1) `POST /api/upload` gains a replace branch: if `replace_asset_id` is supplied it UPDATEs the asset row and DELETEs the old R2 object instead of INSERTing. (2) `AssetGrid` (server component) passes its already-fetched `assetList` down to `AssetUpload` as `existingAssets`. (3) `AssetUpload` (client component) name-matches each picked file against `existingAssets`; matches queue as `pendingConfirms` and render inline confirm chips before uploading.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@aws-sdk/client-s3` (DeleteObjectCommand), Supabase admin client, Tailwind CSS, Jest + node environment tests.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/api/upload/route.ts` |
| Modify | `src/components/dashboard/asset-grid.tsx` |
| Modify | `src/components/dashboard/asset-upload.tsx` |
| Create | `__tests__/api/upload/replace.test.ts` |

---

## Task 1: Extend `POST /api/upload` with replace mode

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Create: `__tests__/api/upload/replace.test.ts`

Replace mode is triggered when the client sends two extra FormData fields:
- `replace_asset_id` — UUID of the existing `Prv_assets` row to overwrite
- `old_r2_key` — the R2 object key to delete after the new file is stored

When both are present the route: uploads new file (same as normal), then **updates** the existing DB row (`r2_key`, `name`, `file_type`), then **deletes** the old R2 object. On any DB error the old R2 object is NOT deleted (fail-safe order).

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/upload/replace.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/upload/route'
import { NextRequest } from 'next/server'

// ── R2 mock ─────────────────────────────────────────────────────────────────
const mockSend = jest.fn().mockResolvedValue({})
jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3')
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  }
})

// ── Supabase auth mock (internal user) ──────────────────────────────────────
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
    }),
  })),
}))

// ── Supabase admin mock ──────────────────────────────────────────────────────
const mockAdminUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'asset-old', r2_key: 'assets/p1/new.png', name: 'hero.png', file_type: 'png' },
        error: null,
      }),
    }),
  }),
})
const mockAdminInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'asset-new', r2_key: 'assets/p1/1234-hero.png' },
      error: null,
    }),
  }),
})
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      insert: mockAdminInsert,
      update: mockAdminUpdate,
    }),
  })),
}))

// ── helpers ──────────────────────────────────────────────────────────────────
function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.append('file', new File(['pixel'], 'hero.png', { type: 'image/png' }))
  fd.append('project_id',   'p1')
  fd.append('service_type', 'art')
  fd.append('r2_key',       'assets/p1/1234-hero.png')
  fd.append('name',         'hero.png')
  fd.append('file_type',    'png')
  fd.append('task_id',      'null')
  Object.entries(overrides).forEach(([k, v]) => fd.set(k, v))
  return fd
}

function makeRequest(fd: FormData) {
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd })
}

// ── tests ────────────────────────────────────────────────────────────────────
describe('POST /api/upload — replace mode', () => {
  beforeEach(() => {
    mockSend.mockResolvedValue({})
    mockAdminUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'asset-old', r2_key: 'assets/p1/new.png' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('updates existing asset row and deletes old R2 object when replace_asset_id supplied', async () => {
    const fd = makeFormData({
      replace_asset_id: 'asset-old',
      old_r2_key:       'assets/p1/old-hero.png',
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.asset.id).toBe('asset-old')

    // should have called R2 delete with old key
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'assets/p1/old-hero.png' }),
    )
  })

  it('uses INSERT (not UPDATE) when replace_asset_id is absent', async () => {
    const fd = makeFormData()
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mockAdminInsert).toHaveBeenCalled()
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
  })

  it('returns 500 and skips R2 delete when DB update fails', async () => {
    mockAdminUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    const fd = makeFormData({
      replace_asset_id: 'asset-old',
      old_r2_key:       'assets/p1/old-hero.png',
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(500)
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx jest --no-coverage __tests__/api/upload/replace.test.ts
```

Expected: 3 failures (`POST not found` / `DeleteObjectCommand not called`).

- [ ] **Step 3: Implement replace branch in `src/app/api/upload/route.ts`**

Replace the entire file:

```typescript
// POST /api/upload
// Receives multipart FormData: file + metadata fields
// Uploads file to R2 server-side (avoids browser CORS issue with direct R2 PUT)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import type { ServiceType } from '@/lib/types/database'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse FormData
  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file             = formData.get('file')             as File   | null
  const project_id       = formData.get('project_id')       as string | null
  const service_type     = formData.get('service_type')     as ServiceType | null
  const task_id          = formData.get('task_id')          as string | null  // may be 'null' string
  const r2_key           = formData.get('r2_key')           as string | null
  const name             = formData.get('name')             as string | null
  const file_type        = formData.get('file_type')        as string | null
  // Replace-mode fields (optional)
  const replace_asset_id = formData.get('replace_asset_id') as string | null
  const old_r2_key       = formData.get('old_r2_key')       as string | null

  if (!file || !project_id || !service_type || !r2_key || !name || !file_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Upload new file to R2 (always happens first, whether insert or replace)
  const bytes = await file.arrayBuffer()
  const r2 = getR2Client()
  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         r2_key,
    Body:        Buffer.from(bytes),
    ContentType: file.type || 'application/octet-stream',
  }))

  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── Replace mode ────────────────────────────────────────────────────────────
  if (replace_asset_id) {
    const { data: asset, error } = await admin
      .from('Prv_assets')
      .update({ r2_key, name, file_type })
      .eq('id', replace_asset_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Only delete old R2 object after DB is confirmed updated
    if (old_r2_key) {
      await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key:    old_r2_key,
      })).catch(() => { /* best-effort — don't fail the request */ })
    }

    return NextResponse.json({ asset })
  }

  // ── Insert mode (default) ────────────────────────────────────────────────────
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .insert({
      project_id,
      service_type,
      name,
      r2_key,
      file_type,
      task_id: task_id === 'null' || !task_id ? null : task_id,
      metadata: {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset })
}
```

- [ ] **Step 4: Run tests — expect all 3 to pass**

```bash
npx jest --no-coverage __tests__/api/upload/replace.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Run full suite — no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/upload/route.ts __tests__/api/upload/replace.test.ts
git commit -m "feat(upload): add replace mode — update DB row + delete old R2 object"
```

---

## Task 2: Pass `existingAssets` from `AssetGrid` to `AssetUpload`

**Files:**
- Modify: `src/components/dashboard/asset-grid.tsx`

`AssetGrid` already fetches `assetList` from Supabase. We just need to pass it down to `AssetUpload` so the client component can do name-matching without an extra fetch.

- [ ] **Step 1: Update `AssetGrid` to pass `existingAssets` to `AssetUpload`**

In `src/components/dashboard/asset-grid.tsx`, change only the `<AssetUpload>` JSX:

```tsx
<AssetUpload
  projectId={projectId}
  serviceType={serviceType}
  taskId={taskId}
  existingAssets={assetList}
/>
```

The full updated `return` block of `AssetGrid`:

```tsx
  return (
    <div className="space-y-4">
      <AssetUpload
        projectId={projectId}
        serviceType={serviceType}
        taskId={taskId}
        existingAssets={assetList}
      />
      <AssetGridClient
        assets={assetList}
        serviceType={serviceType}
        spineVersion={spineVersion}
        projectId={projectId}
        presignedUrls={presignedUrls}
      />
    </div>
  )
```

- [ ] **Step 2: Run tests — no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass (no test covers `AssetGrid` JSX directly — TypeScript will catch prop errors at build time).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/asset-grid.tsx
git commit -m "feat(asset-grid): pass existingAssets to AssetUpload for name-matching"
```

---

## Task 3: Add replace confirm UI to `AssetUpload`

**Files:**
- Modify: `src/components/dashboard/asset-upload.tsx`

When the user picks or drops file(s), each file is checked against `existingAssets` by name (case-insensitive). Matches are pushed onto a `pendingConfirms` queue and rendered as inline confirm chips. Non-matching files upload immediately as before.

Confirm chip shows:
> **`garnet_idle.png` already exists** — [ Replace ] [ Add new ]

Clicking **Replace** calls `uploadFile(file, matchedAsset)` which sends `replace_asset_id` + `old_r2_key` in the form data.  
Clicking **Add new** calls `uploadFile(file)` — current behaviour.

- [ ] **Step 1: Implement updated `asset-upload.tsx`**

Replace the entire file content:

```tsx
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
  if (!IMAGE_TYPES.includes(file.type)) return file

  return new Promise<File>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      if (w <= MAX_PX && h <= MAX_PX) { resolve(file); return }

      const ratio  = Math.min(MAX_PX / w, MAX_PX / h)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const mimeOut  = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality  = mimeOut === 'image/jpeg' ? 0.88 : undefined
      const extOut   = mimeOut === 'image/png'  ? 'png' : 'jpg'
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const newName  = `${baseName}.${extOut}`

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], newName, { type: mimeOut }))
        },
        mimeOut,
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length >= 3 && ['txt', 'bytes'].includes(parts[parts.length - 1])) {
    return parts[parts.length - 2].toLowerCase()
  }
  return parts.pop()?.toLowerCase() ?? 'bin'
}

export function AssetUpload({ projectId, serviceType, taskId, existingAssets = [] }: AssetUploadProps) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
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

      if (replaceAsset) {
        formData.append('replace_asset_id', replaceAsset.id)
        formData.append('old_r2_key',       replaceAsset.r2_key)
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData })

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

  /** For each file: if name matches an existing asset → queue confirm; else upload directly. */
  async function handleFiles(files: FileList | null) {
    if (!files?.length) return

    const newConfirms: PendingConfirm[] = []
    const directUploads: File[] = []

    for (const file of Array.from(files)) {
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
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass (component is client-only; no new unit tests needed — replace logic is covered by Task 1 API tests).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/asset-upload.tsx
git commit -m "feat(asset-upload): inline replace confirm when filename matches existing asset"
```

---

## Task 4: Push and verify deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

Expected: GitHub Actions auto-deploy triggers → `preview.tdgamestudio.com` updated within ~2 min.

- [ ] **Step 2: Smoke-test manually on production**
  1. Open a character's Art tab → upload a file that already exists (same name)
  2. Confirm: amber chip appears with filename, "Replace" + "Add new" buttons
  3. Click **Replace** → asset updates, old file gone from grid, page refreshes
  4. Upload a brand-new filename → uploads directly with no chip (existing behaviour unchanged)

- [ ] **Step 3: Update memory files**

Append to `.agent/meta/LOG.md`:
```
## 2026-06-07 (Asset Replace feature)
- feat: POST /api/upload replace mode (replace_asset_id + old_r2_key) — updates DB row, deletes old R2 object
- feat: AssetGrid passes existingAssets to AssetUpload
- feat: AssetUpload auto-matches filename → inline amber confirm chip (Replace / Add new)
- 3 new tests in __tests__/api/upload/replace.test.ts
- All tests pass, pushed to main → auto-deploy
```
