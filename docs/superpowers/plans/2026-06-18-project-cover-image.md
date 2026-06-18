# Project Cover Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow internal team to upload a dedicated cover image per project, displayed on the client portal's project card.

**Architecture:** A new column `cover_r2_key TEXT NULL` is added to `Prv_projects`. A dedicated API route (`/api/projects/[id]/cover`) handles upload to R2 and updates the project record. The portal page reads `cover_r2_key` first, falling back to the first Art asset if NULL. The dashboard Settings tab gains a "Portal Cover" section that auto-saves on upload/remove.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (server + admin client), AWS S3 SDK (Cloudflare R2), Tailwind CSS.

## Global Constraints

- Never call `supabase.auth.getSession()` — always use `supabase.auth.getUser()`.
- Server-side only: `SUPABASE_SERVICE_ROLE_KEY`, `R2_*` env vars.
- Client-side safe: `NEXT_PUBLIC_R2_PUBLIC_URL` for building preview URLs in `'use client'` components.
- All Supabase table names are `Prv_`-prefixed and must be quoted in SQL: `"Prv_projects"`.
- Auth pattern: `createClient()` (from `@/lib/supabase/server`) for user identity; `createAdminClient()` (from `@/lib/supabase/admin`) for privileged writes.
- Tests live in `__tests__/` mirroring `src/`. API tests require `@jest-environment node` pragma.
- Run tests: `npx jest --no-coverage`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260618000000_add_project_cover.sql` | Create | Add `cover_r2_key` column |
| `src/lib/types/database.ts` | Modify | Add `cover_r2_key` to `PrvProject` |
| `src/app/api/projects/[id]/cover/route.ts` | Create | POST (upload) + DELETE (remove) |
| `__tests__/api/projects/cover.test.ts` | Create | API route unit tests |
| `src/components/dashboard/project-settings-form.tsx` | Modify | Add "Portal Cover" section |
| `src/app/(portal)/portal/page.tsx` | Modify | Priority cover resolution logic |

---

### Task 1: DB Migration + TypeScript Types

**Files:**
- Create: `supabase/migrations/20260618000000_add_project_cover.sql`
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Produces: `PrvProject.cover_r2_key: string | null` — used by Tasks 2, 3, 4.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260618000000_add_project_cover.sql
ALTER TABLE "Prv_projects"
  ADD COLUMN cover_r2_key TEXT NULL;
```

- [ ] **Step 2: Apply the migration to the remote Supabase project**

Use the Supabase MCP tool `apply_migration` with:
- `project_id`: `zjunfcyymesfpeikspzf`
- `name`: `add_project_cover`
- `query`: the SQL above

Expected: migration runs without error; `cover_r2_key` column appears in `Prv_projects`.

- [ ] **Step 3: Add `cover_r2_key` to the TypeScript `PrvProject` interface**

In `src/lib/types/database.ts`, find the `PrvProject` interface and add after `share_allowed_ips`:

```ts
  /** R2 key of the portal cover image. NULL = fallback to first Art asset. */
  cover_r2_key: string | null
```

The full updated interface (for reference — only the new line is added):

```ts
export interface PrvProject {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  spine_version: string | null
  share_enabled: boolean
  share_token: string | null
  card_bg_type: 'color' | 'image'
  card_bg_value: string
  allow_download: boolean
  allow_comments: boolean
  default_skin: string | null
  share_internal_only: boolean
  share_allowed_ips: string | null
  /** R2 key of the portal cover image. NULL = fallback to first Art asset. */
  cover_r2_key: string | null
  created_at: string
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (pre-existing shadcn/ui base-ui errors are acceptable).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260618000000_add_project_cover.sql src/lib/types/database.ts
git commit -m "feat: add cover_r2_key column to Prv_projects"
```

---

### Task 2: Cover API Route + Tests

**Files:**
- Create: `src/app/api/projects/[id]/cover/route.ts`
- Create: `__tests__/api/projects/cover.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`, `createAdminClient` from `@/lib/supabase/admin`, `PrvProject.cover_r2_key: string | null` from Task 1.
- Produces:
  - `POST /api/projects/[id]/cover` → `{ r2_key: string }` (200) or error (400/401/403/500)
  - `DELETE /api/projects/[id]/cover` → `{ ok: true }` (200) or error (401/403/500)

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/projects/cover.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { POST, DELETE } from '@/app/api/projects/[id]/cover/route'
import { NextRequest } from 'next/server'

const mockAnonFrom = jest.fn()
const mockAdminFrom = jest.fn()
const mockS3Send = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn(),
}))

function makeInternalClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: mockAnonFrom,
  }
}

function makeAnonClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(),
  }
}

function makeFormDataReq(withFile = true) {
  const fd = new FormData()
  if (withFile) {
    fd.append('file', new File(['imgdata'], 'cover.jpg', { type: 'image/jpeg' }))
  }
  return new NextRequest('http://localhost/api/projects/p1/cover', {
    method: 'POST',
    body: fd,
  })
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/projects/p1/cover', { method: 'DELETE' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockS3Send.mockResolvedValue({})

  const { createClient } = require('@/lib/supabase/server')
  createClient.mockResolvedValue(makeInternalClient())

  // Default: internal role
  mockAnonFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
  })

  // Default: admin update succeeds
  mockAdminFrom.mockReturnValue({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
})

describe('POST /api/projects/[id]/cover', () => {
  it('returns 200 with r2_key when internal user uploads a file', async () => {
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.r2_key).toMatch(/^covers\/p1\/\d+-cover\.jpg$/)
  })

  it('returns 403 when user has client role', async () => {
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    })
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeFormDataReq(false), { params: { id: 'p1' } })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValueOnce(makeAnonClient())
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/projects/[id]/cover', () => {
  it('returns 200 with ok:true when cover removed by internal user', async () => {
    const res = await DELETE(makeDeleteReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 403 when user has client role', async () => {
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    })
    const res = await DELETE(makeDeleteReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest --no-coverage __tests__/api/projects/cover.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/projects/[id]/cover/route'`

- [ ] **Step 3: Create the API route**

Create `src/app/api/projects/[id]/cover/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function getInternalUser(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, error: 'Unauthorized' as const }
  const { data: profile } = await supabase
    .from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal') return { user: null, supabase, error: 'Forbidden' as const }
  return { user, supabase, error: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getInternalUser(request)
  if (error === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'Forbidden' || !user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const r2Key = `covers/${params.id}/${Date.now()}-${safeName}`

  const bytes = await file.arrayBuffer()
  await getR2Client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: r2Key,
    Body: Buffer.from(bytes),
    ContentType: file.type || 'image/jpeg',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: dbError } = await admin
    .from('Prv_projects')
    .update({ cover_r2_key: r2Key })
    .eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ r2_key: r2Key })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getInternalUser(request)
  if (error === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'Forbidden' || !user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: dbError } = await admin
    .from('Prv_projects')
    .update({ cover_r2_key: null })
    .eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest --no-coverage __tests__/api/projects/cover.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Run full test suite — verify no regressions**

```bash
npx jest --no-coverage
```

Expected: all existing tests + 6 new = all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/projects/[id]/cover/route.ts __tests__/api/projects/cover.test.ts
git commit -m "feat: add cover image API route (POST upload + DELETE remove)"
```

---

### Task 3: Dashboard UI — Portal Cover Section

**Files:**
- Modify: `src/components/dashboard/project-settings-form.tsx`

**Interfaces:**
- Consumes: `PrvProject.cover_r2_key: string | null` (Task 1), `POST /api/projects/[id]/cover` → `{ r2_key: string }`, `DELETE /api/projects/[id]/cover` → `{ ok: true }` (Task 2).
- Produces: UI section visible in the Settings tab of the project detail page.

**Context:** `ProjectSettingsForm` is a `'use client'` component in `src/components/dashboard/project-settings-form.tsx`. It already has state for other project fields. The new cover section is self-contained: it has its own state and auto-saves immediately without the main "Save Settings" button.

The preview URL in a client component uses `process.env.NEXT_PUBLIC_R2_PUBLIC_URL` (the public-facing prefix, e.g. `https://prv.tdgamestudio.com`).

- [ ] **Step 1: Add cover state variables**

Open `src/components/dashboard/project-settings-form.tsx`. After the existing `useState` declarations (around line 36), add:

```ts
  const [coverR2Key,    setCoverR2Key]    = useState<string | null>(project.cover_r2_key ?? null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError,    setCoverError]    = useState<string | null>(null)
```

- [ ] **Step 2: Add cover upload and remove handlers**

After the existing `handleBgImageUpload` function (around line 71), add:

```ts
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    setCoverError(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/projects/${project.id}/cover`, {
      method: 'POST',
      body: formData,
    })
    setCoverUploading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setCoverError(json.error ?? 'Upload failed')
      return
    }
    const json = await res.json()
    setCoverR2Key(json.r2_key)
    // Reset input so same file can be re-uploaded if needed
    e.target.value = ''
  }

  async function handleCoverRemove() {
    setCoverUploading(true)
    setCoverError(null)
    const res = await fetch(`/api/projects/${project.id}/cover`, { method: 'DELETE' })
    setCoverUploading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setCoverError(json.error ?? 'Remove failed')
      return
    }
    setCoverR2Key(null)
  }
```

- [ ] **Step 3: Add the Portal Cover UI section**

In the JSX `return (...)` block, find the comment `{/* ── Card Background ─────────────────────────── */}` (around line 191) and insert the new section **above** it:

```tsx
      {/* ── Portal Cover ──────────────────────────────── */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#666' }}>
          Portal Cover
        </label>

        {/* 16:9 preview */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            aspectRatio: '16/9',
            border: '1px solid rgba(255,255,255,0.1)',
            background: coverR2Key
              ? undefined
              : 'linear-gradient(135deg, rgba(255,149,0,0.06) 0%, rgba(255,149,0,0.02) 50%, #080808 100%)',
            position: 'relative',
          }}
        >
          {coverR2Key && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${coverR2Key}`}
              alt="Cover preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          {!coverR2Key && (
            <span
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '2rem', opacity: 0.15, userSelect: 'none',
              }}
            >
              🖼
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: coverUploading ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: coverUploading ? '#555' : '#aaa',
              pointerEvents: coverUploading ? 'none' : undefined,
            }}
          >
            {coverUploading ? 'Uploading…' : '📷 Upload Cover'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
              disabled={coverUploading}
            />
          </label>
          {coverR2Key && !coverUploading && (
            <button
              type="button"
              onClick={handleCoverRemove}
              className="text-xs"
              style={{ color: '#EF4444' }}
            >
              Remove
            </button>
          )}
        </div>

        {coverError && (
          <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{coverError}</p>
        )}

        <p className="text-xs" style={{ color: '#444' }}>
          Shown on the project card in the client portal
        </p>
      </div>
```

- [ ] **Step 4: Verify build is clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Run tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS (no tests for this component — it's a client component with fetch calls; integration verified manually in Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/project-settings-form.tsx
git commit -m "feat: add Portal Cover upload section to project settings"
```

---

### Task 4: Portal Page — Cover Resolution Logic + Verification

**Files:**
- Modify: `src/app/(portal)/portal/page.tsx`

**Interfaces:**
- Consumes: `PrvProject.cover_r2_key: string | null` (Task 1), `getPublicUrl` from `@/lib/r2`.
- Produces: `coverUrl` passed to `PortalProjectCard` — unchanged interface, new priority logic.

**Context:** This is a Server Component. `getPublicUrl` constructs URLs using `process.env.R2_PUBLIC_URL` (server-side env var). `PortalProjectCard` already accepts `coverUrl?: string` — no changes needed to that component.

- [ ] **Step 1: Update cover resolution in the `projectData` map**

In `src/app/(portal)/portal/page.tsx`, find the existing cover logic (around line 64):

```ts
      let coverUrl: string | undefined
      if (firstArt?.[0]?.r2_key) {
        coverUrl = getPublicUrl(firstArt[0].r2_key)
      }
```

Replace it with:

```ts
      let coverUrl: string | undefined
      if (project.cover_r2_key) {
        coverUrl = getPublicUrl(project.cover_r2_key)
      } else if (firstArt?.[0]?.r2_key) {
        coverUrl = getPublicUrl(firstArt[0].r2_key)
      }
```

- [ ] **Step 2: Verify TypeScript — `cover_r2_key` is now on `PrvProject`**

The `projects` query (line 39) selects `'id, name, description, status, created_at, client_id'`. This does **not** include `cover_r2_key`, so `project.cover_r2_key` will be `undefined` at runtime.

Update the select to include the new column:

```ts
  const { data: projects } = (await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at, client_id, cover_r2_key')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })) as { data: PrvProject[] | null }
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(portal)/portal/page.tsx
git commit -m "feat: use cover_r2_key for portal project card cover with Art fallback"
```

- [ ] **Step 6: Push and deploy**

```bash
git push origin main
```

GitHub Actions auto-deploys to `preview.tdgamestudio.com`.

- [ ] **Step 7: Manual verification on production**

1. Log in as internal user → go to a project → Settings tab.
2. Confirm "Portal Cover" section appears above "Card Background".
3. Upload an image → preview updates immediately (no Save needed).
4. Open client portal (`/portal`) → project card shows uploaded cover.
5. Click "Remove" → preview clears; portal falls back to first Art asset.
6. On a project with no Art assets: remove cover → portal shows gradient placeholder.
7. Existing projects (no cover set) → portal unchanged (first Art asset still shown).
