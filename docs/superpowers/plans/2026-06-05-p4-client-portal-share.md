# P4: Client Portal + Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-facing portal (`/portal`) where logged-in clients view their projects and assets read-only, and the public share page (`/share/[token]`) that shows a project without login when `share_enabled = true`.

**Architecture:** Portal reuses all P3 preview components (`AssetViewerModal`, `AssetGridClient`, `Comments`) with a new `readonly` prop to hide upload/delete. The share page uses a server-side admin client to bypass RLS, pre-generates presigned R2 URLs for all assets (no auth required on client), and passes them directly to the same viewer components so no additional download API is needed. `AssetViewerModal` is updated to use a pre-set `presignedUrl` for downloads when one is available — avoiding auth-required API calls on the share page.

**Tech Stack:** Next.js 14 App Router, Supabase SSR (server client + admin client for share), Cloudflare R2 `getPresignedGetUrl`, shadcn/ui Tabs, React hooks, existing preview components.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(portal)/layout.tsx` | Modify | Portal header: user display_name + logout link |
| `src/app/(portal)/portal/page.tsx` | Modify | Grid of client's own projects |
| `src/app/(portal)/portal/[pid]/page.tsx` | Create | Read-only project detail: Art/Animation/VFX/Comments tabs |
| `src/components/dashboard/asset-grid-client.tsx` | Modify | Add `readonly?: boolean` prop — hide delete button |
| `src/components/preview/asset-viewer-modal.tsx` | Modify | Use `presignedUrl` directly for download when available |
| `src/app/share/[token]/page.tsx` | Modify | Full project view for anonymous share (404 if disabled) |

---

## Task 1: Portal Layout — Header with display_name + Logout

**Files:**
- Modify: `src/app/(portal)/layout.tsx`

The portal layout is a Server Component. It fetches the user's `display_name` from `Prv_profiles`. For unauthenticated users on `/share/*` this layout is not used (share is a separate route group), so we can safely require auth here.

- [ ] **Step 1: Replace layout with auth-aware header**

```typescript
// src/app/(portal)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PrvProfile } from '@/lib/types/database'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'display_name'> | null }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800">TDGame Preview</span>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{profile?.display_name ?? user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-red-500 hover:underline"
            >
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "portal/layout"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(portal\)/layout.tsx
git commit -m "feat(p4): add portal layout with header and logout"
```

---

## Task 2: Portal Projects List Page

**Files:**
- Modify: `src/app/(portal)/portal/page.tsx`

Clients only see projects where their `profile.client_id` matches `Prv_projects.client_id`.

- [ ] **Step 1: Replace stub with real data**

```typescript
// src/app/(portal)/portal/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'client_id'> | null }

  if (!profile?.client_id) {
    return (
      <div className="text-center py-20 text-gray-400">
        No client account linked. Please contact your studio contact.
      </div>
    )
  }

  const { data: projects } = await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false }) as { data: PrvProject[] | null }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Projects</h1>

      {!projects?.length ? (
        <p className="text-gray-400">No active projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/${project.id}`}
              className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold text-gray-900 text-lg">{project.name}</h2>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "portal/portal/page"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(portal\)/portal/page.tsx
git commit -m "feat(p4): add portal projects list page"
```

---

## Task 3: AssetGridClient — Add `readonly` Prop

**Files:**
- Modify: `src/components/dashboard/asset-grid-client.tsx`

When `readonly={true}`, hide the delete button. Portal and share pages pass `readonly` — no delete for clients.

- [ ] **Step 1: Add `readonly` prop**

Read the current file first, then edit the `AssetGridClientProps` interface and the JSX:

```typescript
// Add to interface:
interface AssetGridClientProps {
  assets: PrvAsset[]
  serviceType: ServiceType
  spineVersion?: string | null
  projectId: string
  readonly?: boolean   // ← ADD THIS
}
```

And in the component destructuring:
```typescript
export function AssetGridClient({
  assets,
  serviceType,
  spineVersion,
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
  readonly = false,       // ← ADD THIS
}: AssetGridClientProps) {
```

Then conditionally render the delete button — replace:
```typescript
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
```

With:
```typescript
            {!readonly && (
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
            )}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "asset-grid-client"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/asset-grid-client.tsx
git commit -m "feat(p4): add readonly prop to AssetGridClient (hide delete for portal/share)"
```

---

## Task 4: AssetViewerModal — Use presignedUrl for Download

**Files:**
- Modify: `src/components/preview/asset-viewer-modal.tsx`

Currently `handleDownload` always calls `/api/assets/[id]/download` (requires auth). When the asset already has `presignedUrl` set (share page pre-generates these), use that directly instead of an API call.

- [ ] **Step 1: Update handleDownload logic**

Read current `asset-viewer-modal.tsx`, then change `handleDownload`:

```typescript
// Replace current handleDownload:
async function handleDownload(assetId: string) {
  const url = await fetchDownloadUrl(assetId)
  const a = document.createElement('a')
  a.href = url
  a.download = assetId === asset.id ? asset.name : (allArtAssets.find((x) => x.id === assetId)?.name ?? assetId)
  a.click()
}

// With:
async function handleDownload(assetId: string) {
  // Use pre-set presigned URL if available (share page), otherwise fetch from API
  const targetAsset = assetId === asset.id ? asset : allArtAssets.find((x) => x.id === assetId)
  const url = targetAsset?.presignedUrl ?? artUrls[assetId] ?? await fetchDownloadUrl(assetId)
  const a = document.createElement('a')
  a.href = url
  a.download = targetAsset?.name ?? assetId
  a.click()
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "asset-viewer-modal"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/asset-viewer-modal.tsx
git commit -m "feat(p4): use pre-set presignedUrl for download in AssetViewerModal (share page)"
```

---

## Task 5: Portal Project Detail Page

**Files:**
- Create: `src/app/(portal)/portal/[pid]/page.tsx`

Clients view a project with tabs: Art, Animation, VFX, Comments. Uses `AssetGridClient` with `readonly={true}`. Comments use existing `Comments` component (clients post via `/api/projects/[id]/comments`).

- [ ] **Step 1: Create page**

```typescript
// src/app/(portal)/portal/[pid]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Comments } from '@/components/preview/comments'
import { Badge } from '@/components/ui/badge'
import type { PrvAsset, PrvProfile, PrvProject } from '@/lib/types/database'

export default async function PortalProjectPage({
  params,
}: {
  params: { pid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get client_id from profile to enforce ownership
  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single() as { data: Pick<PrvProfile, 'client_id'> | null }

  const { data: project } = await supabase
    .from('Prv_projects')
    .select('*')
    .eq('id', params.pid)
    .single() as { data: PrvProject | null }

  // 404 if project not found or doesn't belong to this client
  if (!project || project.client_id !== profile?.client_id) notFound()

  const { data: assets } = await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at') as { data: PrvAsset[] | null }

  const allAssets = assets ?? []
  const artAssets = allAssets.filter((a) => a.service_type === 'art')
  const animationAssets = allAssets.filter((a) => a.service_type === 'animation')
  const vfxAssets = allAssets.filter((a) => a.service_type === 'vfx')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

      {project.description && (
        <p className="text-gray-600 mb-6">{project.description}</p>
      )}

      <Tabs defaultValue="art">
        <TabsList className="mb-6">
          <TabsTrigger value="art">Art ({artAssets.length})</TabsTrigger>
          <TabsTrigger value="animation">Animation ({animationAssets.length})</TabsTrigger>
          <TabsTrigger value="vfx">VFX ({vfxAssets.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGridClient
            assets={artAssets}
            serviceType="art"
            spineVersion={null}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGridClient
            assets={animationAssets}
            serviceType="animation"
            spineVersion={project.spine_version}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGridClient
            assets={vfxAssets}
            serviceType="vfx"
            spineVersion={null}
            projectId={project.id}
            readonly
          />
        </TabsContent>

        <TabsContent value="comments">
          <div className="max-w-2xl">
            <Comments projectId={project.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "portal/\[pid\]"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(portal)/portal/[pid]/page.tsx"
git commit -m "feat(p4): add portal project detail page (read-only tabs)"
```

---

## Task 6: Public Share Page

**Files:**
- Modify: `src/app/share/[token]/page.tsx`

No login required. Uses admin client (bypasses RLS) to:
1. Look up project by `share_token` — 404 if not found or `share_enabled = false`
2. Fetch all assets for the project
3. Generate presigned R2 URLs server-side for every asset
4. Pass pre-signed assets to `AssetGridClient` with `readonly={true}` and `presignedUrl` set

Since `AssetViewerModal` accepts `asset.presignedUrl`, the viewer will work without any auth-required API calls.

- [ ] **Step 1: Update share page**

```typescript
// src/app/share/[token]/page.tsx
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresignedGetUrl } from '@/lib/r2'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Badge } from '@/components/ui/badge'
import type { PrvAsset, PrvProject } from '@/lib/types/database'

interface Props {
  params: { token: string }
}

export default async function SharePage({ params }: Props) {
  const admin = createAdminClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: project } = await admin
    .from('Prv_projects')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single() as { data: PrvProject | null }

  if (!project) notFound()

  const { data: assets } = await admin
    .from('Prv_assets')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at') as { data: PrvAsset[] | null }

  // Pre-generate presigned URLs server-side (no client auth needed)
  const allAssets: (PrvAsset & { presignedUrl: string })[] = await Promise.all(
    (assets ?? []).map(async (asset) => ({
      ...asset,
      presignedUrl: await getPresignedGetUrl(asset.r2_key).catch(() => ''),
    }))
  )

  const artAssets = allAssets.filter((a) => a.service_type === 'art')
  const animationAssets = allAssets.filter((a) => a.service_type === 'animation')
  const vfxAssets = allAssets.filter((a) => a.service_type === 'vfx')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal branded header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <span className="font-semibold text-gray-800">TDGame Preview</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <Badge variant="secondary">Shared Preview</Badge>
        </div>

        {project.description && (
          <p className="text-gray-600 mb-6">{project.description}</p>
        )}

        <Tabs defaultValue="art">
          <TabsList className="mb-6">
            <TabsTrigger value="art">Art ({artAssets.length})</TabsTrigger>
            <TabsTrigger value="animation">Animation ({animationAssets.length})</TabsTrigger>
            <TabsTrigger value="vfx">VFX ({vfxAssets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="art">
            <AssetGridClient
              assets={artAssets}
              serviceType="art"
              spineVersion={null}
              projectId={project.id}
              readonly
            />
          </TabsContent>

          <TabsContent value="animation">
            <AssetGridClient
              assets={animationAssets}
              serviceType="animation"
              spineVersion={project.spine_version}
              projectId={project.id}
              readonly
            />
          </TabsContent>

          <TabsContent value="vfx">
            <AssetGridClient
              assets={vfxAssets}
              serviceType="vfx"
              spineVersion={null}
              projectId={project.id}
              readonly
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "share/\[token\]"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/share/[token]/page.tsx"
git commit -m "feat(p4): implement public share page with server-side presigned URLs"
```

---

## Task 7: Full Test Run + Build Clean

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All 38 tests pass (no new tests added — P4 adds no testable pure functions; server component logic is covered by TypeScript + build).

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit memory files**

```bash
git add .agent/meta/TASKS.md .agent/meta/LOG.md
git commit -m "chore: mark P4 complete in memory files"
```

- [ ] **Step 4: Push**

```bash
git push origin feat/p1-foundation-auth
```

---

## Self-Review

**Spec coverage:**
- ✅ `/portal` — client's project grid (Task 2)
- ✅ `/portal/[pid]` — tabs: Art / Animation / VFX / Comments (Task 5)
- ✅ Art → lightbox on click (via `AssetGridClient` → `AssetViewerModal` → `ImageLightbox`)
- ✅ Animation → Spine viewer modal on click (via `AssetViewerModal` → `SpinePlayer`)
- ✅ VFX → video/gif modal on click (via `AssetViewerModal` → `VfxViewer`)
- ✅ Comments tab — project-level thread via existing `Comments` component (Task 5)
- ✅ Portal header with display_name + logout (Task 1)
- ✅ `/share/[token]` — same layout as portal, no login required (Task 6)
- ✅ Share returns 404 if `share_enabled = false` or token not found (Task 6 — `.eq('share_enabled', true)`)
- ✅ Download buttons on share page work without auth (Task 4 + 6 — presignedUrl pre-set)
- ✅ Minimal header on share page with studio branding (Task 6)
- ⚠️ Comments not shown on share page — spec §8 says anonymous view is read-only, no comment form. This is intentional: share page omits Comments tab (clients who want to comment must log in).

**Placeholder scan:** All steps contain full code. No TBD items.

**Type consistency:**
- `AssetGridClient` `readonly` prop: `boolean` (default `false`) — used in Tasks 3, 5, 6
- `AssetViewerModal` `asset.presignedUrl?: string` — already in type from P3
- `PrvAsset & { presignedUrl: string }` passed to `AssetGridClient assets: PrvAsset[]` — compatible (subtype via intersection)
- `createAdminClient()` imported from `@/lib/supabase/admin` — same import as all existing routes
- `getPresignedGetUrl(key)` from `@/lib/r2` — same as download route Task 1 in P3
