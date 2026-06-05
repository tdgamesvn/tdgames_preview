# P3: Asset Preview System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete asset preview system — image lightbox, VFX viewer, Spine animation player, download API, and a comments system with Supabase Realtime — used by both the internal dashboard and (in P4) the client portal.

**Architecture:** Preview components are pure client-side React components in `src/components/preview/`. A unified `AssetViewerModal` picks the right viewer based on `service_type`/`file_type`. Downloads go through a Next.js API route that generates a 1-hour presigned GET URL from R2, keeping credentials server-side. Comments use Supabase Realtime for live updates.

**Tech Stack:** Next.js 14 App Router, Supabase SSR + Realtime, Cloudflare R2 presigned URLs, `@aws-sdk/s3-request-presigner`, Spine Web Player (CDN via dynamic `<script>` injection), shadcn/ui Dialog + Tabs, React hooks.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/api/assets/[id]/download/route.ts` | Create | GET: generate R2 presigned download URL |
| `src/app/api/projects/[id]/comments/route.ts` | Create | GET list + POST new comment |
| `src/components/preview/image-lightbox.tsx` | Create | Fullscreen image viewer for Art assets |
| `src/components/preview/vfx-viewer.tsx` | Create | GIF/video/Unity package viewer |
| `src/components/preview/spine-player.tsx` | Create | Spine Web Player (dynamic script load by version) |
| `src/components/preview/asset-viewer-modal.tsx` | Create | Unified modal — routes to correct viewer by type |
| `src/components/preview/comments.tsx` | Create | Comment list + form with Realtime subscription |
| `src/components/dashboard/asset-grid.tsx` | Modify | Add click → open AssetViewerModal |
| `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx` | Modify | Add Comments tab |
| `__tests__/api/assets/download.test.ts` | Create | Tests for download route |
| `__tests__/api/projects/comments.test.ts` | Create | Tests for comments route |

---

## Task 1: Download API Route

**Files:**
- Create: `src/app/api/assets/[id]/download/route.ts`
- Create: `__tests__/api/assets/download.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/api/assets/download.test.ts
/**
 * @jest-environment node
 */
import { GET } from '@/app/api/assets/[id]/download/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/r2', () => ({
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-download'),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'a1', r2_key: 'assets/a1.png', name: 'hero.png', file_type: 'png' },
        error: null,
      }),
    }),
  })),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  })),
}))

function makeReq() {
  return new NextRequest('http://localhost/api/assets/a1/download', { method: 'GET' })
}

describe('GET /api/assets/[id]/download', () => {
  it('returns presigned URL for authenticated user', async () => {
    const res = await GET(makeReq(), { params: { id: 'a1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://r2.example.com/signed-download')
    expect(json.filename).toBe('hero.png')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    const res = await GET(makeReq(), { params: { id: 'a1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when asset not found', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    })
    const res = await GET(makeReq(), { params: { id: 'bad' } })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest --no-coverage __tests__/api/assets/download.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/assets/[id]/download/route'"

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/assets/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Any authenticated user (internal or client) can download
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data: asset, error } = await admin
    .from('Prv_assets')
    .select('id, r2_key, name, file_type')
    .eq('id', params.id)
    .single()

  if (error || !asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = await getPresignedGetUrl(asset.r2_key)
  return NextResponse.json({ url, filename: asset.name })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/api/assets/download.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assets/[id]/download/route.ts __tests__/api/assets/download.test.ts
git commit -m "feat(p3): add asset download API route (presigned GET URL)"
```

---

## Task 2: Comments API Route

**Files:**
- Create: `src/app/api/projects/[id]/comments/route.ts`
- Create: `__tests__/api/projects/comments.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/api/projects/comments.test.ts
/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/projects/[id]/comments/route'
import { NextRequest } from 'next/server'

const mockAnonFrom = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: mockAnonFrom,
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

function makeReq(body?: object, method = 'GET') {
  return new NextRequest('http://localhost/api/projects/p1/comments', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  const { createClient } = require('@/lib/supabase/server')
  createClient.mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: mockAnonFrom,
  })
})

describe('GET /api/projects/[id]/comments', () => {
  it('returns comments list', async () => {
    const fakeComments = [{ id: 'c1', content: 'Looks great!', author_id: 'u1', created_at: '' }]
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: fakeComments, error: null }),
    })
    const res = await GET(makeReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].content).toBe('Looks great!')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    const res = await GET(makeReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/projects/[id]/comments', () => {
  it('creates comment and returns 201', async () => {
    const fakeComment = { id: 'c2', content: 'Nice work!', author_id: 'u1', project_id: 'p1', asset_id: null, created_at: '' }
    mockAdminFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: fakeComment, error: null }),
      }),
    })
    const res = await POST(makeReq({ content: 'Nice work!' }, 'POST'), { params: { id: 'p1' } })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.content).toBe('Nice work!')
  })

  it('returns 400 when content missing', async () => {
    const res = await POST(makeReq({}, 'POST'), { params: { id: 'p1' } })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest --no-coverage __tests__/api/projects/comments.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/projects/[id]/comments/route'"

- [ ] **Step 3: Implement the route**

```typescript
// src/app/api/projects/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('Prv_comments')
    .select('id, content, asset_id, author_id, created_at, Prv_profiles(display_name)')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { content, asset_id } = body as { content?: string; asset_id?: string | null }
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('Prv_comments')
    .insert({
      project_id: params.id,
      asset_id: asset_id ?? null,
      author_id: user.id,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/api/projects/comments.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/ __tests__/api/projects/
git commit -m "feat(p3): add comments API route (GET list + POST create)"
```

---

## Task 3: Image Lightbox (Art Preview)

**Files:**
- Create: `src/components/preview/image-lightbox.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/preview/image-lightbox.tsx
'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
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
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
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

      {/* Image */}
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

      {/* Thumbnail strip */}
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
                i === currentIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={asset.presignedUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "preview/image-lightbox"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/image-lightbox.tsx
git commit -m "feat(p3): add image lightbox component for Art preview"
```

---

## Task 4: VFX Viewer

**Files:**
- Create: `src/components/preview/vfx-viewer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/preview/vfx-viewer.tsx
'use client'

import { Download, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VfxViewerProps {
  name: string
  fileType: string           // 'gif' | 'mp4' | 'webm' | 'unitypackage' | other
  presignedUrl: string       // for playback
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "preview/vfx-viewer"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/vfx-viewer.tsx
git commit -m "feat(p3): add VFX viewer component (GIF/video/Unity package)"
```

---

## Task 5: Spine Player Component

**Files:**
- Create: `src/components/preview/spine-player.tsx`

The Spine Web Player is loaded from CDN dynamically per version. CDN pattern:
`https://unpkg.com/@esotericsoftware/spine-player@{version}/dist/iife/spine-player.js`

The Spine player attaches to a DOM element and expects:
- `skeleton`: URL to JSON or .skel file  
- `atlas`: URL to .atlas file
- `animation`: default animation name

- [ ] **Step 1: Create the component**

```typescript
// src/components/preview/spine-player.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SpinePlayerProps {
  // All presigned URLs
  skeletonUrl: string       // .json or .skel presigned URL
  atlasUrl: string          // .atlas presigned URL
  animations: string[]      // from asset.metadata.animations
  skins: string[]           // from asset.metadata.skins
  spineVersion: string      // e.g. "4.2", "3.8"
  assetName: string
  onDownload: () => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getCdnUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

function getCssCdnUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.css`
}

export function SpinePlayer({
  skeletonUrl,
  atlasUrl,
  animations,
  skins,
  spineVersion,
  assetName,
  onDownload,
}: SpinePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    async function loadAndInit() {
      // Load CSS if not already loaded
      const cssId = `spine-css-${spineVersion}`
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link')
        link.id = cssId
        link.rel = 'stylesheet'
        link.href = getCssCdnUrl(spineVersion)
        document.head.appendChild(link)
      }

      // Load JS if not already loaded
      const scriptId = `spine-js-${spineVersion}`
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById(scriptId)) { resolve(); return }
        const script = document.createElement('script')
        script.id = scriptId
        script.src = getCdnUrl(spineVersion)
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load Spine player v${spineVersion}`))
        document.body.appendChild(script)
      })

      if (cancelled || !containerRef.current) return

      // @ts-ignore — spine-player attaches to window.spine
      const SpinePlayerClass = (window as any).spine?.SpinePlayer
      if (!SpinePlayerClass) {
        setError('Spine player failed to initialize')
        return
      }

      try {
        new SpinePlayerClass(containerRef.current, {
          jsonUrl: skeletonUrl,
          atlasUrl: atlasUrl,
          animation: animations[0] ?? 'idle',
          skin: skins[0] ?? 'default',
          showControls: true,
          backgroundColor: '#1a1a2e',
          premultipliedAlpha: true,
        })
        if (!cancelled) setLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Spine player error')
      }
    }

    loadAndInit().catch((e) => {
      if (!cancelled) setError(e.message)
    })

    return () => { cancelled = true }
  }, [skeletonUrl, atlasUrl, animations, skins, spineVersion])

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-red-400">
          <p className="font-medium">Spine Player Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full rounded-xl overflow-hidden bg-[#1a1a2e]"
          style={{ height: '500px' }}
        >
          {!loaded && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading Spine v{spineVersion}…
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Spine v{spineVersion} · {animations.length} animations · {skins.length} skins
        </div>
        <Button onClick={onDownload} variant="outline" size="sm" className="gap-2">
          <Download size={14} />
          Download {assetName}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "preview/spine-player"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/spine-player.tsx
git commit -m "feat(p3): add Spine web player component (dynamic CDN load by version)"
```

---

## Task 6: Asset Viewer Modal (Unified)

**Files:**
- Create: `src/components/preview/asset-viewer-modal.tsx`

This is the unified modal that:
1. Fetches the presigned download URL from `/api/assets/[id]/download`
2. Routes to `ImageLightbox`, `SpinePlayer`, or `VfxViewer` based on asset type
3. Shows a comments panel (added in Task 7)

- [ ] **Step 1: Create the component**

```typescript
// src/components/preview/asset-viewer-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { ImageLightbox, type LightboxAsset } from '@/components/preview/image-lightbox'
import { VfxViewer } from '@/components/preview/vfx-viewer'
import { SpinePlayer } from '@/components/preview/spine-player'
import type { PrvAsset } from '@/lib/types/database'

interface AssetViewerModalProps {
  asset: PrvAsset & { presignedUrl?: string }
  allArtAssets?: (PrvAsset & { presignedUrl?: string })[]  // for lightbox navigation
  spineVersion?: string | null
  onClose: () => void
}

async function fetchDownloadUrl(assetId: string): Promise<string> {
  const res = await fetch(`/api/assets/${assetId}/download`)
  if (!res.ok) throw new Error('Failed to get download URL')
  const { url } = await res.json()
  return url
}

export function AssetViewerModal({
  asset,
  allArtAssets = [],
  spineVersion,
  onClose,
}: AssetViewerModalProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(asset.presignedUrl ?? null)
  const [artUrls, setArtUrls] = useState<Record<string, string>>({})
  const [lightboxIndex, setLightboxIndex] = useState(
    allArtAssets.findIndex((a) => a.id === asset.id)
  )
  const [loading, setLoading] = useState(!asset.presignedUrl)

  useEffect(() => {
    if (asset.presignedUrl) return
    setLoading(true)
    fetchDownloadUrl(asset.id)
      .then((url) => { setPresignedUrl(url); setLoading(false) })
      .catch(() => setLoading(false))
  }, [asset.id, asset.presignedUrl])

  async function handleDownload(assetId: string) {
    const url = await fetchDownloadUrl(assetId)
    const a = document.createElement('a')
    a.href = url
    a.download = asset.name
    a.click()
  }

  // Art lightbox mode
  if (asset.service_type === 'art' && allArtAssets.length > 0) {
    const lightboxAssets: LightboxAsset[] = allArtAssets.map((a) => ({
      id: a.id,
      name: a.name,
      presignedUrl: a.presignedUrl ?? artUrls[a.id] ?? '',
    }))

    // Pre-fetch URLs for lightbox assets that don't have them
    useEffect(() => {
      allArtAssets.forEach((a) => {
        if (!a.presignedUrl && !artUrls[a.id]) {
          fetchDownloadUrl(a.id).then((url) =>
            setArtUrls((prev) => ({ ...prev, [a.id]: url }))
          )
        }
      })
    }, [allArtAssets]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <ImageLightbox
        assets={lightboxAssets}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={onClose}
        onNavigate={setLightboxIndex}
        onDownload={handleDownload}
      />
    )
  }

  // Full-screen modal for Spine/VFX
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="font-semibold text-white truncate">{asset.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Loading preview…
            </div>
          )}

          {!loading && presignedUrl && asset.service_type === 'animation' && spineVersion && (
            <SpinePlayer
              skeletonUrl={presignedUrl}
              atlasUrl={presignedUrl.replace(/\.[^.]+$/, '.atlas')}
              animations={(asset.metadata as any)?.animations ?? []}
              skins={(asset.metadata as any)?.skins ?? ['default']}
              spineVersion={spineVersion}
              assetName={asset.name}
              onDownload={() => handleDownload(asset.id)}
            />
          )}

          {!loading && presignedUrl && asset.service_type === 'vfx' && (
            <VfxViewer
              name={asset.name}
              fileType={asset.file_type}
              presignedUrl={presignedUrl}
              onDownload={() => handleDownload(asset.id)}
            />
          )}

          {!loading && asset.service_type === 'art' && (
            // Single art asset (no lightbox siblings)
            presignedUrl ? (
              <img
                src={presignedUrl}
                alt={asset.name}
                className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg"
              />
            ) : (
              <div className="text-gray-400 text-center py-12">Preview unavailable</div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "preview/asset-viewer-modal"
```

Expected: No errors (or only minor type warnings).

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/asset-viewer-modal.tsx
git commit -m "feat(p3): add unified asset viewer modal (art/animation/VFX routing)"
```

---

## Task 7: Comments Component (Realtime)

**Files:**
- Create: `src/components/preview/comments.tsx`

Uses Supabase Realtime to subscribe to new comments so all viewers see live updates.

- [ ] **Step 1: Create the component**

```typescript
// src/components/preview/comments.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Comment {
  id: string
  content: string
  author_id: string
  asset_id: string | null
  created_at: string
  Prv_profiles?: { display_name: string } | null
}

interface CommentsProps {
  projectId: string
  assetId?: string | null   // null = project-level comments
}

export function Comments({ projectId, assetId = null }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Initial load
  useEffect(() => {
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((data: Comment[]) => {
        // Filter by asset_id if provided
        const filtered = assetId
          ? data.filter((c) => c.asset_id === assetId)
          : data.filter((c) => c.asset_id === null)
        setComments(filtered)
      })
  }, [projectId, assetId])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Prv_comments',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newComment = payload.new as Comment
          const matchesFilter = assetId
            ? newComment.asset_id === assetId
            : newComment.asset_id === null
          if (matchesFilter) {
            setComments((prev) => [...prev, newComment])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, assetId])

  // Scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), asset_id: assetId }),
    })
    setContent('')
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">
                  {comment.Prv_profiles?.display_name ?? 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
          }}
        />
        <Button type="submit" disabled={submitting || !content.trim()} size="sm" className="self-end">
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "preview/comments"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/comments.tsx
git commit -m "feat(p3): add comments component with Supabase Realtime subscription"
```

---

## Task 8: Wire Up Dashboard — Asset Grid Clickable + Comments Tab

**Files:**
- Modify: `src/components/dashboard/asset-grid.tsx`
- Modify: `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`

### Part A — Make AssetGrid cards open the viewer

The `AssetGrid` is a Server Component so it can't hold `useState`. We'll convert it to pass data to a new Client Component `AssetGridClient` for interactivity, while keeping the data fetch in the Server Component.

- [ ] **Step 1: Create `AssetGridClient` wrapper**

```typescript
// src/components/dashboard/asset-grid-client.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AssetViewerModal } from '@/components/preview/asset-viewer-modal'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridClientProps {
  assets: PrvAsset[]
  serviceType: ServiceType
  spineVersion?: string | null
  projectId: string
}

const typeIcon = (t: ServiceType) =>
  t === 'art' ? '🖼️' : t === 'animation' ? '🦴' : '🎬'

export function AssetGridClient({
  assets,
  serviceType,
  spineVersion,
  projectId,
}: AssetGridClientProps) {
  const [viewingAsset, setViewingAsset] = useState<PrvAsset | null>(null)

  if (!assets.length) {
    return (
      <p className="text-gray-400 text-sm">
        No {serviceType} assets yet. Upload above.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-white rounded-lg shadow overflow-hidden group cursor-pointer"
            onClick={() => setViewingAsset(asset)}
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="text-3xl">{typeIcon(serviceType)}</span>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-xs text-gray-400 uppercase">{asset.file_type}</p>
            </div>
            <div className="px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <form
                action={`/api/assets/${asset.id}`}
                method="DELETE"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 w-full text-xs"
                >
                  Delete
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {viewingAsset && (
        <AssetViewerModal
          asset={viewingAsset}
          allArtAssets={serviceType === 'art' ? assets : []}
          spineVersion={spineVersion}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Update `asset-grid.tsx` to use the client wrapper**

Read the current file first (`src/components/dashboard/asset-grid.tsx`), then replace it with:

```typescript
// src/components/dashboard/asset-grid.tsx
import { createClient } from '@/lib/supabase/server'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
  spineVersion?: string | null
}

export async function AssetGrid({ projectId, serviceType, spineVersion }: AssetGridProps) {
  const supabase = (await createClient()) as any
  const { data: assets } = (await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  return (
    <div className="space-y-6">
      <AssetUpload projectId={projectId} serviceType={serviceType} />
      <AssetGridClient
        assets={assets ?? []}
        serviceType={serviceType}
        spineVersion={spineVersion}
        projectId={projectId}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update project detail page to pass `spineVersion` + add Comments tab**

Read the current `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`, then update:

```typescript
// src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Comments } from '@/components/preview/comments'
import { Badge } from '@/components/ui/badge'
import type { PrvProject, PrvClient } from '@/lib/types/database'

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string; pid: string }
}) {
  const supabase = (await createClient()) as any

  const [{ data: client }, { data: project }] = await Promise.all([
    supabase
      .from('Prv_clients')
      .select('id, name')
      .eq('id', params.id)
      .single() as Promise<{ data: Pick<PrvClient, 'id' | 'name'> | null }>,
    supabase
      .from('Prv_projects')
      .select('*')
      .eq('id', params.pid)
      .single() as Promise<{ data: PrvProject | null }>,
  ])

  if (!client || !project) notFound()

  return (
    <div className="p-8">
      <nav className="text-sm text-gray-500 mb-4">
        <span>{client.name}</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-900">{project.name}</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="vfx">VFX</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGrid projectId={project.id} serviceType="art" spineVersion={null} />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGrid
            projectId={project.id}
            serviceType="animation"
            spineVersion={project.spine_version}
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGrid projectId={project.id} serviceType="vfx" spineVersion={null} />
        </TabsContent>

        <TabsContent value="comments">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Project Comments</h2>
            <Comments projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettingsForm project={project} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 4: Full test run**

```bash
npx jest --no-coverage
```

Expected: All tests pass (31 existing + 7 new = 38 total)

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/asset-grid.tsx src/components/dashboard/asset-grid-client.tsx \
  src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx
git commit -m "feat(p3): wire asset grid with viewer modal + add comments tab to project detail"
```

---

## Self-Review

**Spec coverage:**
- ✅ Art PNG/JPG preview → ImageLightbox (Task 3)
- ✅ Click image → fullscreen lightbox with prev/next navigation (Task 3)
- ✅ Spine player: play/pause/loop via spine-player controls, animation selector from metadata (Task 5)
- ✅ VFX: GIF `<img>`, MP4/WebM `<video controls>`, Unity icon+download (Task 4)
- ✅ Downloads via presigned GET URL from API (Task 1), R2 credentials server-side
- ✅ Comments: project-level thread, Realtime subscription (Tasks 2, 7)
- ✅ Comments wired to project detail page (Task 8)
- ⚠️ PSD thumbnail: spec says "display pre-exported thumbnail PNG" — handled by the same `ImageLightbox` since team manually provides the thumbnail PNG. No server-side PSD rendering (out of scope per spec §11).
- ⚠️ Asset-level comments in viewer modal: `Comments` component accepts `assetId` prop — `AssetViewerModal` can be extended in P4 to pass the asset ID. Left as future wiring in P4.

**Placeholder scan:** All tasks contain actual code. No TBD items.

**Type consistency:**
- `LightboxAsset` defined in `image-lightbox.tsx`, imported into `asset-viewer-modal.tsx`
- `AssetGridClient` props accept `PrvAsset[]` (same type as `AssetGrid` fetches)
- `Comments` props: `projectId: string`, `assetId?: string | null`
- `SpinePlayer` props match what `AssetViewerModal` passes
