# Share Page — Portal Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public share link (`/share/[token]`) render the same character roster + full showcase experience as the authenticated client portal, with no login required.

**Architecture:** Add a new anonymous-safe `/api/share-spine/[token]/[taskId]/[name]` proxy route that validates by share token instead of user session. Add an optional `spineApiBase` prop to `SpineAnimationGallery`. Create a share layout (no auth, "Public Preview" badge) and rewrite both share pages to use the portal visual components (`PortalCharacterGrid`, `ShowcaseHero`, `ArtFilmstrip`, `SpineAnimationGallery`, `VfxInlineGrid`). All data fetching uses `createAdminClient()` validated by `share_token + share_enabled = true`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase admin client, Cloudflare R2 (via `getR2Object` / `getPublicUrl`), shadcn/ui, existing portal components.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| **CREATE** | `src/app/api/share-spine/[token]/[taskId]/[name]/route.ts` | R2 spine proxy — validates by share token, no auth session required |
| **MODIFY** | `src/components/dashboard/spine-animation-gallery.tsx` | Add `spineApiBase?: string` prop (default `'/api/spine'`) |
| **CREATE** | `src/app/share/layout.tsx` | Public share layout — grain overlay + header, no login/logout |
| **MODIFY** | `src/app/share/[token]/page.tsx` | Roster page — replace flat asset list with `PortalCharacterGrid` |
| **CREATE** | `src/app/share/[token]/characters/[cid]/page.tsx` | Character detail — `ShowcaseHero` + filmstrip + animations + VFX |
| **CREATE** | `__tests__/api/share-spine/route.test.ts` | Unit tests for the new share-spine route |

> **Note on downloads:** `ArtFilmstrip` and `VfxInlineGrid` call `/api/assets/${id}/download` internally, which requires auth. Share pages pass `allowDownload={false}` — downloads require login. This is a known limitation; a future `share-download` route can enable it.

---

### Task 1: share-spine API route (TDD)

**Files:**
- Create: `src/app/api/share-spine/[token]/[taskId]/[name]/route.ts`
- Create: `__tests__/api/share-spine/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/share-spine/route.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { GET } from '@/app/api/share-spine/[token]/[taskId]/[name]/route'
import { NextRequest } from 'next/server'

const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

const mockGetR2Object = jest.fn()
jest.mock('@/lib/r2', () => ({
  getR2Object: mockGetR2Object,
}))

function makeRequest(token: string, taskId: string, name: string) {
  return new NextRequest(
    `http://localhost/api/share-spine/${token}/${taskId}/${encodeURIComponent(name)}`
  )
}

function makeParams(token: string, taskId: string, name: string) {
  return { params: { token, taskId, name: encodeURIComponent(name) } }
}

function makeProjectChain(project: object | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: project, error: project ? null : { message: 'not found' } }),
  }
}

function makeAssetChain(asset: object | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: asset, error: null }),
  }
}

beforeEach(() => jest.clearAllMocks())

it('returns 404 when share token is invalid', async () => {
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(
    makeRequest('bad-token', 'task1', 'char.json'),
    makeParams('bad-token', 'task1', 'char.json')
  )
  expect(res.status).toBe(404)
})

it('returns 404 when share_enabled is false', async () => {
  // share_enabled=false → the eq chain returns null (no match)
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(
    makeRequest('tok', 'task1', 'char.json'),
    makeParams('tok', 'task1', 'char.json')
  )
  expect(res.status).toBe(404)
})

it('returns 404 when asset not found', async () => {
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain(null))
  const res = await GET(
    makeRequest('tok', 'task1', 'missing.json'),
    makeParams('tok', 'task1', 'missing.json')
  )
  expect(res.status).toBe(404)
})

it('streams R2 object when token and asset are valid', async () => {
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain({ r2_key: 'uploads/abc123/char.json', name: 'char.json' }))
  mockGetR2Object.mockResolvedValue({
    body: 'stream-body',
    contentType: 'application/json',
    contentLength: 42,
  })

  const res = await GET(
    makeRequest('tok', 'task1', 'char.json'),
    makeParams('tok', 'task1', 'char.json')
  )
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('application/json')
})

it('returns 304 when ETag matches', async () => {
  const r2Key = 'uploads/abc123/char.json'
  const etag = `"${r2Key.slice(0, 24)}"`
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain({ r2_key: r2Key, name: 'char.json' }))

  const req = new NextRequest('http://localhost/api/share-spine/tok/task1/char.json', {
    headers: { 'if-none-match': etag },
  })
  const res = await GET(req, makeParams('tok', 'task1', 'char.json'))
  expect(res.status).toBe(304)
})
```

- [ ] **Step 2: Run tests — expect them to FAIL**

```bash
cd /Users/tdgames_mac01/Work/apps/tdgames_preview
npx jest __tests__/api/share-spine/route.test.ts --no-coverage
```
Expected: `Cannot find module '@/app/api/share-spine/[token]/[taskId]/[name]/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/share-spine/[token]/[taskId]/[name]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getR2Object } from '@/lib/r2'

function contentTypeFor(name: string, fallback?: string): string {
  if (name.endsWith('.json')) return 'application/json'
  if (name.endsWith('.atlas')) return 'text/plain; charset=utf-8'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.webp')) return 'image/webp'
  return fallback || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; taskId: string; name: string } }
) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate share token — must exist and be enabled
  const { data: project } = await admin
    .from('Prv_projects')
    .select('id')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const name = decodeURIComponent(params.name)

  const { data: asset } = await admin
    .from('Prv_assets')
    .select('r2_key, name')
    .eq('task_id', params.taskId)
    .eq('name', name)
    .limit(1)
    .maybeSingle()

  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const etag = `"${asset.r2_key.slice(0, 24)}"`
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
    })
  }

  try {
    const obj = await getR2Object(asset.r2_key)
    if (!obj.body) return NextResponse.json({ error: 'Empty object' }, { status: 404 })

    return new NextResponse(obj.body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(asset.name, obj.contentType),
        ...(obj.contentLength ? { 'Content-Length': String(obj.contentLength) } : {}),
        'Cache-Control': 'private, no-cache',
        ETag: etag,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest __tests__/api/share-spine/route.test.ts --no-coverage
```
Expected: `5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/share-spine __tests__/api/share-spine
git commit -m "feat: add share-spine API route for anonymous Spine asset streaming"
```

---

### Task 2: Add `spineApiBase` prop to SpineAnimationGallery

**Files:**
- Modify: `src/components/dashboard/spine-animation-gallery.tsx`

- [ ] **Step 1: Add the prop to the interface and component**

In `src/components/dashboard/spine-animation-gallery.tsx`, change the interface and destructuring:

Old interface (lines 6–14):
```typescript
interface SpineAnimationGalleryProps {
  taskId: string
  jsonName: string
  atlasName: string
  spineVersion: string
  /** Project-level card background */
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
}
```

New interface:
```typescript
interface SpineAnimationGalleryProps {
  taskId: string
  jsonName: string
  atlasName: string
  spineVersion: string
  /** Override the spine API base path. Defaults to '/api/spine'.
   *  Share pages pass '/api/share-spine/<token>' for anonymous access. */
  spineApiBase?: string
  /** Project-level card background */
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
}
```

Old destructuring (lines 22–29):
```typescript
export function SpineAnimationGallery({
  taskId,
  jsonName,
  atlasName,
  spineVersion,
  cardBgType,
  cardBgValue,
}: SpineAnimationGalleryProps) {
  const jsonUrl = `/api/spine/${taskId}/${encodeURIComponent(jsonName)}`
  const atlasUrl = `/api/spine/${taskId}/${encodeURIComponent(atlasName)}`
```

New destructuring:
```typescript
export function SpineAnimationGallery({
  taskId,
  jsonName,
  atlasName,
  spineVersion,
  spineApiBase = '/api/spine',
  cardBgType,
  cardBgValue,
}: SpineAnimationGalleryProps) {
  const jsonUrl = `${spineApiBase}/${taskId}/${encodeURIComponent(jsonName)}`
  const atlasUrl = `${spineApiBase}/${taskId}/${encodeURIComponent(atlasName)}`
```

- [ ] **Step 2: Run full test suite to verify no regressions**

```bash
npx jest --no-coverage
```
Expected: all existing tests pass (no tests directly cover this component, but build should succeed)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/spine-animation-gallery.tsx
git commit -m "feat: add spineApiBase prop to SpineAnimationGallery for share-page support"
```

---

### Task 3: Share layout

**Files:**
- Create: `src/app/share/layout.tsx`

> The current share page (`src/app/share/[token]/page.tsx`) has its own inline header. The new layout replaces that — remove the `<header>` block from `page.tsx` in Task 4.

- [ ] **Step 1: Create the layout**

Create `src/app/share/layout.tsx`:

```typescript
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      {/* Grain texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.95)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-white">TDGAME</span>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,149,0,0.1)', color: '#FF9500' }}
          >
            Preview
          </span>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}
        >
          Public Preview
        </span>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/share/layout.tsx
git commit -m "feat: add share layout with grain overlay and Public Preview badge"
```

---

### Task 4: Rewrite share project page (roster)

**Files:**
- Modify: `src/app/share/[token]/page.tsx`

- [ ] **Step 1: Replace the file content**

Replace `src/app/share/[token]/page.tsx` entirely with:

```typescript
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'
import { PortalCharacterGrid, type CharacterCardData } from '@/components/portal/portal-character-grid'
import type { SpineCardConfig } from '@/components/dashboard/character-card-item'
import type { PrvAsset, PrvProject, PrvTask } from '@/lib/types/database'

interface Props { params: { token: string } }

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = (await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: PrvProject | null }

  if (!project) notFound()

  const { data: tasks } = (await admin
    .from('Prv_tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvTask[] | null }

  const taskList = tasks ?? []

  // Build character card data — same logic as portal project page
  const spineApiBase = `/api/share-spine/${params.token}`

  const cards: CharacterCardData[] = await Promise.all(
    taskList.map(async (task) => {
      const [{ data: artAssets }, spineResult] = await Promise.all([
        admin
          .from('Prv_assets')
          .select('*')
          .eq('project_id', project.id)
          .eq('task_id', task.id)
          .eq('service_type', 'art')
          .order('sort_order')
          .order('created_at')
          .limit(1) as Promise<{ data: PrvAsset[] | null }>,
        task.avatar_asset_id
          ? (admin
              .from('Prv_assets')
              .select('*')
              .eq('id', task.avatar_asset_id)
              .single() as Promise<{ data: PrvAsset | null }>)
          : Promise.resolve({ data: null } as { data: PrvAsset | null }),
      ])

      const artUrl = artAssets?.[0] ? getPublicUrl(artAssets[0].r2_key) : undefined

      let spineConfig: SpineCardConfig | undefined
      const spineAsset = spineResult.data
      if (spineAsset && project.spine_version && task.avatar_asset_id) {
        const base = spineAsset.name.replace(/\.[^./]+$/, '')
        spineConfig = {
          jsonUrl: `${spineApiBase}/${task.id}/${encodeURIComponent(spineAsset.name)}`,
          atlasUrl: `${spineApiBase}/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
          animationName: task.avatar_animation ?? '',
          skinName: task.avatar_skin ?? '',
          scale: task.avatar_scale ?? 1,
          offsetX: task.avatar_offset_x ?? 0,
          offsetY: task.avatar_offset_y ?? 0,
          spineVersion: project.spine_version,
        }
      }

      return { task, artUrl, spineConfig }
    })
  )

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm" style={{ color: '#666' }}>{project.description}</p>
        )}
        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#444' }}>
          {taskList.length} character{taskList.length !== 1 ? 's' : ''}
        </p>
      </div>

      {taskList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No assets uploaded yet</p>
          <p className="text-xs mt-1" style={{ color: '#333' }}>
            Check back soon — our team is working on it.
          </p>
        </div>
      ) : (
        <PortalCharacterGrid
          cards={cards}
          linkPrefix={`/share/${params.token}`}
          cardBgType={project.card_bg_type}
          cardBgValue={project.card_bg_value}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run tests**

```bash
npx jest --no-coverage
```
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/share/[token]/page.tsx
git commit -m "feat: rewrite share project page to use PortalCharacterGrid roster"
```

---

### Task 5: Share character detail page

**Files:**
- Create: `src/app/share/[token]/characters/[cid]/page.tsx`

- [ ] **Step 1: Create the character detail page**

Create `src/app/share/[token]/characters/[cid]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicUrl } from '@/lib/r2'
import { ShowcaseHero } from '@/components/portal/showcase-hero'
import { ArtFilmstrip } from '@/components/portal/art-filmstrip'
import { SectionHeader } from '@/components/portal/section-header'
import { SpineAnimationGallery } from '@/components/dashboard/spine-animation-gallery'
import { VfxInlineGrid } from '@/components/portal/vfx-inline-grid'
import type { PrvAsset, PrvProject, PrvTask } from '@/lib/types/database'

interface Props { params: { token: string; cid: string } }

export default async function ShareCharacterPage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate share token
  const { data: project } = (await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()) as { data: PrvProject | null }

  if (!project) notFound()

  // Validate character (task) belongs to this project
  const { data: task } = (await admin
    .from('Prv_tasks')
    .select('*')
    .eq('id', params.cid)
    .eq('project_id', project.id)
    .single()) as { data: PrvTask | null }

  if (!task) notFound()

  // Fetch all assets for this character
  const { data: assets } = (await admin
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .eq('task_id', task.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvAsset[] | null }

  const allAssets = assets ?? []
  const artAssets  = allAssets.filter(a => a.service_type === 'art')
  const animAssets = allAssets.filter(a => a.service_type === 'animation')
  const vfxAssets  = allAssets.filter(a => a.service_type === 'vfx')

  const spineApiBase = `/api/share-spine/${params.token}`

  // Art filmstrip assets
  const filmstripAssets = artAssets
    .map(a => ({ id: a.id, name: a.name, presignedUrl: getPublicUrl(a.r2_key) }))
    .filter(a => a.presignedUrl)

  // VFX grid assets
  const vfxCards = vfxAssets
    .map(a => ({ id: a.id, name: a.name, fileType: a.file_type, presignedUrl: getPublicUrl(a.r2_key) }))
    .filter(a => a.presignedUrl)

  // Spine hero config
  let spineHeroConfig:
    | { jsonUrl: string; atlasUrl: string; animationName: string; spineVersion: string; spineAvatarBg: string }
    | undefined

  if (task.avatar_asset_id && project.spine_version) {
    const { data: spineAsset } = (await admin
      .from('Prv_assets')
      .select('name')
      .eq('id', task.avatar_asset_id)
      .single()) as { data: Pick<PrvAsset, 'name'> | null }

    if (spineAsset) {
      const base = spineAsset.name.replace(/\.[^./]+$/, '')
      spineHeroConfig = {
        jsonUrl:       `${spineApiBase}/${task.id}/${encodeURIComponent(spineAsset.name)}`,
        atlasUrl:      `${spineApiBase}/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
        animationName: task.avatar_animation ?? '',
        spineVersion:  project.spine_version,
        spineAvatarBg: project.card_bg_type === 'color' && project.card_bg_value
          ? project.card_bg_value
          : '#00000000',
      }
    }
  }

  // Animation gallery: json + atlas pair
  const jsonAnim  = animAssets.find(a => a.name.endsWith('.json'))
  const atlasAnim = jsonAnim
    ? animAssets.find(a => a.name.endsWith('.atlas') && a.name.startsWith(jsonAnim.name.replace('.json', '')))
    : undefined

  const heroArtUrl = filmstripAssets[0]?.presignedUrl

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-6 flex-wrap"
        style={{ color: '#888' }}
      >
        <Link href={`/share/${params.token}`} className="hover:text-white transition-colors">
          {project.name}
        </Link>
        <span>›</span>
        <span className="text-white">{task.name}</span>
      </nav>

      {/* Character name */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          {task.name}
        </h1>
        <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#444' }}>
          {project.name}
        </p>
      </div>

      {/* Zone A — Spine / Art hero */}
      <ShowcaseHero
        characterName={task.name}
        spineConfig={spineHeroConfig}
        artUrl={!spineHeroConfig ? heroArtUrl : undefined}
      />

      {/* Zones B–D — content sections */}
      <div className="space-y-12 mt-10">

        {/* Zone B — Art filmstrip (downloads disabled for anonymous) */}
        {filmstripAssets.length > 0 && (
          <section>
            <SectionHeader label="Art" count={filmstripAssets.length} />
            <ArtFilmstrip assets={filmstripAssets} allowDownload={false} />
          </section>
        )}

        {/* Zone C — Animation gallery */}
        {jsonAnim && atlasAnim && project.spine_version && (
          <section>
            <SectionHeader label="Animations" />
            <SpineAnimationGallery
              taskId={task.id}
              jsonName={jsonAnim.name}
              atlasName={atlasAnim.name}
              spineVersion={project.spine_version}
              spineApiBase={spineApiBase}
              cardBgType={project.card_bg_type}
              cardBgValue={project.card_bg_value}
            />
          </section>
        )}

        {/* Zone D — VFX (downloads disabled for anonymous) */}
        {vfxCards.length > 0 && (
          <section>
            <SectionHeader label="VFX" count={vfxCards.length} />
            <VfxInlineGrid assets={vfxCards} allowDownload={false} />
          </section>
        )}

      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass (42+ passing)

- [ ] **Step 4: Commit**

```bash
git add src/app/share/[token]/characters
git commit -m "feat: add share character detail page with Spine hero + art + VFX showcase"
```

---

### Task 6: Build verification + push

- [ ] **Step 1: Full production build**

```bash
npm run build
```
Expected: `✓ Compiled successfully` — zero errors, zero type errors

- [ ] **Step 2: Verify new routes appear in build output**

Check build output for these routes:
```
○ /share/[token]
○ /share/[token]/characters/[cid]
○ /api/share-spine/[token]/[taskId]/[name]
```
All should be listed as dynamic routes.

- [ ] **Step 3: Push to main (triggers auto-deploy)**

```bash
git push origin main
```
Expected: GitHub Actions triggers deploy to `preview.tdgamestudio.com`

- [ ] **Step 4: Smoke-test on production**

1. Open any project in the dashboard → Settings tab
2. Enable "Public Share Link", copy the URL
3. Open the URL in an **incognito window** (no session)
4. Verify: character roster grid renders with card backgrounds
5. Click a character card → verify full showcase page renders (hero + sections)
6. Verify breadcrumb link returns to roster

---

## Self-Review

**Spec coverage check:**
- ✅ Share project page → `PortalCharacterGrid` with `linkPrefix` pointing to share character route
- ✅ Share character page → `ShowcaseHero` + `ArtFilmstrip` + `SpineAnimationGallery` + `VfxInlineGrid`
- ✅ Anonymous-safe spine proxy (`/api/share-spine/[token]/...`) — validates token, no auth session
- ✅ `SpineAnimationGallery.spineApiBase` prop — share pages pass the share-spine base
- ✅ Share layout — grain overlay, "Public Preview" badge, no login/logout
- ✅ Token validation in all three new/modified server-side files
- ✅ `allowDownload={false}` on share pages (downloads require auth — noted as known limitation)
- ✅ Comments omitted from share character page
- ✅ TDD for the API route (5 tests)
- ✅ Frequent commits — one per task

**Type consistency check:**
- `CharacterCardData` from `PortalCharacterGrid` — used correctly (task, artUrl, spineConfig)
- `SpineCardConfig` from `character-card-item` — all 7 fields populated
- `SpineHeroConfig` in `ShowcaseHero` — jsonUrl, atlasUrl, animationName, spineVersion, spineAvatarBg — all present
- `LightboxAsset` for ArtFilmstrip — { id, name, presignedUrl } — all present
- `VfxCardData` — { id, name, fileType, presignedUrl } — all present
- `spineApiBase` prop added to both interface and destructuring in `SpineAnimationGallery`
