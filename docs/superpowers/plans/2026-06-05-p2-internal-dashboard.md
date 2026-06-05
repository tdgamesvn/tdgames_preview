# P2: Internal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full internal team dashboard: client/project CRUD, asset upload to Cloudflare R2, and project settings management.

**Architecture:** Next.js App Router Server Components for data fetching, Server Actions for mutations, client components only for interactive upload UI. R2 credentials stay server-side via presigned URLs; the browser uploads directly to R2 without hitting our server for large files. Supabase service role used only in API routes; RLS-filtered anon key used in Server Actions/Components.

**Tech Stack:** Next.js 14 App Router, Supabase SSR (@supabase/ssr), Cloudflare R2 (AWS S3-compatible via @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner), shadcn/ui, Tailwind CSS, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(dashboard)/layout.tsx` | Modify | Add Sidebar + top nav |
| `src/components/dashboard/sidebar.tsx` | Create | Client list nav sidebar (client component) |
| `src/app/(dashboard)/dashboard/page.tsx` | Modify | Overview: stats + recent uploads |
| `src/app/(dashboard)/dashboard/clients/page.tsx` | Create | Client list page |
| `src/app/(dashboard)/dashboard/clients/[id]/page.tsx` | Create | Client detail + project list |
| `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx` | Create | Project detail (tabs: Art/Animation/VFX/Settings) |
| `src/components/dashboard/client-form.tsx` | Create | Create/edit client dialog (client component) |
| `src/components/dashboard/project-form.tsx` | Create | Create/edit project dialog (client component) |
| `src/components/dashboard/asset-grid.tsx` | Create | Asset grid display per service type (server component) |
| `src/components/dashboard/asset-upload.tsx` | Create | Drag & drop upload + progress (client component) |
| `src/components/dashboard/project-settings-form.tsx` | Create | Spine version, share toggle, status (client component) |
| `src/lib/r2.ts` | Create | Cloudflare R2 client (server-side only) |
| `src/lib/actions/clients.ts` | Create | Server Actions: createClient, updateClient, deleteClient |
| `src/lib/actions/projects.ts` | Create | Server Actions: createProject, updateProject, deleteProject |
| `src/app/api/upload/presign/route.ts` | Create | POST: generate R2 presigned PUT URL |
| `src/app/api/assets/route.ts` | Create | POST: save asset record to Supabase |
| `src/app/api/assets/[id]/route.ts` | Create | DELETE: remove asset from DB + R2 |
| `src/lib/supabase/admin.ts` | Create | Service-role Supabase client (server-only) |
| `__tests__/api/upload/presign.test.ts` | Create | Tests for presign route |
| `__tests__/api/assets.test.ts` | Create | Tests for assets route |
| `__tests__/lib/actions/clients.test.ts` | Create | Tests for client actions |
| `__tests__/lib/actions/projects.test.ts` | Create | Tests for project actions |

---

## Task 1: Install Dependencies + shadcn Components

**Files:**
- Modify: `package.json` (via npm install)
- Create new shadcn components via CLI

- [ ] **Step 1: Install R2/S3 SDK**

```bash
cd /Users/tdgames_mac01/Work/apps/tdgames_preview
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Expected: packages installed, no errors.

- [ ] **Step 2: Add shadcn components needed for dashboard**

```bash
npx shadcn@latest add table dialog tabs select badge separator toast avatar
```

When prompted about existing components, press Enter (keep existing). Expected: new files in `src/components/ui/`.

- [ ] **Step 3: Verify installation**

```bash
ls src/components/ui/
```

Expected: `table.tsx dialog.tsx tabs.tsx select.tsx badge.tsx separator.tsx toast.tsx avatar.tsx` (plus existing button, card, input, label).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/
git commit -m "chore: add R2 SDK + shadcn table/dialog/tabs/select/badge/separator/toast/avatar"
```

---

## Task 2: Supabase Admin Client + R2 Client

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/r2.ts`

- [ ] **Step 1: Create admin Supabase client (service role — server-only)**

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// NEVER import this in client components — service role key bypasses RLS
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 2: Create R2 client**

```typescript
// src/lib/r2.ts
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

// R2 is S3-compatible; endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
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

export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  // URL expires in 1 hour
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function getPresignedGetUrl(key: string): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}
```

- [ ] **Step 3: Update .env.example with R2 vars**

```bash
# Open .env.example and add these lines if not present:
```

Read `/Users/tdgames_mac01/Work/apps/tdgames_preview/.env.example`, then add the R2 section if missing:

```
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=tdgames-preview
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/admin.ts src/lib/r2.ts .env.example
git commit -m "feat: add admin supabase client + R2 client"
```

---

## Task 3: Server Actions — Client Management

**Files:**
- Create: `src/lib/actions/clients.ts`
- Create: `__tests__/lib/actions/clients.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/actions/clients.test.ts
import { createClient, updateClient, deleteClient } from '@/lib/actions/clients'

const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

beforeEach(() => {
  jest.clearAllMocks()
  // Default successful chain
  const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'c1', name: 'Test', slug: 'test' }, error: null }), error: null }
  mockInsert.mockReturnValue(chain)
  mockUpdate.mockReturnValue(chain)
  mockDelete.mockReturnValue({ error: null })
  mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: jest.fn().mockReturnThis() })
})

describe('createClient', () => {
  it('calls Supabase insert with correct data', async () => {
    const result = await createClient({ name: 'Acme', slug: 'acme' })
    expect(mockFrom).toHaveBeenCalledWith('Prv_clients')
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Acme', slug: 'acme', logo_url: null })
    expect(result.error).toBeNull()
  })

  it('returns error when insert fails', async () => {
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'duplicate slug' } }) }
    mockInsert.mockReturnValue(chain)
    const result = await createClient({ name: 'Acme', slug: 'acme' })
    expect(result.error).toBe('duplicate slug')
  })
})

describe('deleteClient', () => {
  it('calls Supabase delete with client id', async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: eqFn }) })
    const result = await deleteClient('c1')
    expect(eqFn).toHaveBeenCalledWith('id', 'c1')
    expect(result.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /Users/tdgames_mac01/Work/apps/tdgames_preview && npx jest --no-coverage __tests__/lib/actions/clients.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/actions/clients'"

- [ ] **Step 3: Implement client actions**

```typescript
// src/lib/actions/clients.ts
'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrvClient } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

export async function createClient(input: {
  name: string
  slug: string
  logo_url?: string | null
}): Promise<ActionResult<PrvClient>> {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase
    .from('Prv_clients')
    .insert({ name: input.name, slug: input.slug, logo_url: input.logo_url ?? null })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  return { data: data as PrvClient, error: null }
}

export async function updateClient(
  id: string,
  input: Partial<Pick<PrvClient, 'name' | 'slug' | 'logo_url'>>
): Promise<ActionResult<PrvClient>> {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase
    .from('Prv_clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { data: data as PrvClient, error: null }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase
    .from('Prv_clients')
    .delete()
    .eq('id', id)
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  return { data: null, error: null }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/lib/actions/clients.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/clients.ts __tests__/lib/actions/clients.test.ts
git commit -m "feat: add client server actions (create/update/delete)"
```

---

## Task 4: Server Actions — Project Management

**Files:**
- Create: `src/lib/actions/projects.ts`
- Create: `__tests__/lib/actions/projects.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/actions/projects.test.ts
import { createProject, updateProject, deleteProject } from '@/lib/actions/projects'

const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createProject', () => {
  it('inserts project with required fields', async () => {
    const fakeProject = { id: 'p1', client_id: 'c1', name: 'Hero Art', description: null, status: 'active', spine_version: null, share_enabled: false, share_token: 'tok', created_at: '' }
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: fakeProject, error: null }) }
    mockInsert.mockReturnValue(chain)
    mockFrom.mockReturnValue({ insert: mockInsert })

    const result = await createProject({ client_id: 'c1', name: 'Hero Art' })
    expect(mockFrom).toHaveBeenCalledWith('Prv_projects')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'c1', name: 'Hero Art' }))
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Hero Art')
  })

  it('returns error on failure', async () => {
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'FK violation' } }) }
    mockInsert.mockReturnValue(chain)
    mockFrom.mockReturnValue({ insert: mockInsert })
    const result = await createProject({ client_id: 'bad', name: 'X' })
    expect(result.error).toBe('FK violation')
  })
})

describe('updateProject', () => {
  it('updates project settings', async () => {
    const chain = { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }) }
    mockUpdate.mockReturnValue(chain)
    mockFrom.mockReturnValue({ update: mockUpdate })
    const result = await updateProject('p1', { spine_version: '4.2', share_enabled: true })
    expect(mockUpdate).toHaveBeenCalledWith({ spine_version: '4.2', share_enabled: true })
    expect(result.error).toBeNull()
  })
})

describe('deleteProject', () => {
  it('deletes project by id', async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: eqFn }) })
    const result = await deleteProject('p1', 'c1')
    expect(eqFn).toHaveBeenCalledWith('id', 'p1')
    expect(result.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest --no-coverage __tests__/lib/actions/projects.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/actions/projects'"

- [ ] **Step 3: Implement project actions**

```typescript
// src/lib/actions/projects.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrvProject } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

export async function createProject(input: {
  client_id: string
  name: string
  description?: string | null
  spine_version?: string | null
}): Promise<ActionResult<PrvProject>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Prv_projects')
    .insert({
      client_id: input.client_id,
      name: input.name,
      description: input.description ?? null,
      spine_version: input.spine_version ?? null,
    })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}`)
  return { data: data as PrvProject, error: null }
}

export async function updateProject(
  id: string,
  input: Partial<Pick<PrvProject, 'name' | 'description' | 'status' | 'spine_version' | 'share_enabled'>>
): Promise<ActionResult<PrvProject>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Prv_projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients`)
  return { data: data as PrvProject, error: null }
}

export async function deleteProject(id: string, clientId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('Prv_projects')
    .delete()
    .eq('id', id)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/lib/actions/projects.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/projects.ts __tests__/lib/actions/projects.test.ts
git commit -m "feat: add project server actions (create/update/delete)"
```

---

## Task 5: API Route — R2 Presigned Upload URL

**Files:**
- Create: `src/app/api/upload/presign/route.ts`
- Create: `__tests__/api/upload/presign.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/api/upload/presign.test.ts
import { POST } from '@/app/api/upload/presign/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/r2', () => ({
  getPresignedPutUrl: jest.fn().mockResolvedValue('https://r2.example.com/presigned'),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
    }),
  })),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/upload/presign', () => {
  it('returns presigned URL for valid internal user', async () => {
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://r2.example.com/presigned')
  })

  it('returns 400 when key or contentType missing', async () => {
    const req = makeRequest({ key: 'assets/abc.png' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when user is not internal', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
      }),
    })
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest --no-coverage __tests__/api/upload/presign.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/upload/presign/route'"

- [ ] **Step 3: Create the route**

```typescript
// src/app/api/upload/presign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedPutUrl } from '@/lib/r2'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Role check — only internal can upload
  const { data: profile } = await supabase
    .from('Prv_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'internal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate body
  const body = await request.json().catch(() => ({}))
  const { key, contentType } = body as { key?: string; contentType?: string }
  if (!key || !contentType) {
    return NextResponse.json({ error: 'key and contentType are required' }, { status: 400 })
  }

  const url = await getPresignedPutUrl(key, contentType)
  return NextResponse.json({ url })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/api/upload/presign.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/upload/presign/route.ts __tests__/api/upload/presign.test.ts
git commit -m "feat: add R2 presigned upload URL API route"
```

---

## Task 6: API Routes — Asset Save + Delete

**Files:**
- Create: `src/app/api/assets/route.ts`
- Create: `src/app/api/assets/[id]/route.ts`
- Create: `__tests__/api/assets.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/api/assets.test.ts
import { POST } from '@/app/api/assets/route'
import { DELETE } from '@/app/api/assets/[id]/route'
import { NextRequest } from 'next/server'

// Mock admin client (used for writes)
const mockInsert = jest.fn()
const mockFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockFrom })),
}))

// Mock anon client (used for auth check)
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
    }),
  })),
}))

jest.mock('@/lib/r2', () => ({ deleteR2Object: jest.fn().mockResolvedValue(undefined) }))

function makeRequest(body: object, method = 'POST') {
  return new NextRequest('http://localhost/api/assets', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/assets', () => {
  it('saves asset record and returns it', async () => {
    const fakeAsset = { id: 'a1', project_id: 'p1', service_type: 'art', name: 'hero.png', r2_key: 'assets/a1.png', file_type: 'png', metadata: {}, sort_order: 0, created_at: '' }
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: fakeAsset, error: null }) }
    mockInsert.mockReturnValue(chain)
    mockFrom.mockReturnValue({ insert: mockInsert })

    const req = makeRequest({ project_id: 'p1', service_type: 'art', name: 'hero.png', r2_key: 'assets/a1.png', file_type: 'png' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('a1')
  })

  it('returns 400 when required fields missing', async () => {
    const req = makeRequest({ project_id: 'p1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/assets/[id]', () => {
  it('deletes asset from DB and R2', async () => {
    const fakeAsset = { id: 'a1', r2_key: 'assets/a1.png' }
    // Admin client: first select to get r2_key, then delete
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeAsset, error: null }),
      delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    })

    const req = new NextRequest('http://localhost/api/assets/a1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'a1' } })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest --no-coverage __tests__/api/assets.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/assets/route'"

- [ ] **Step 3: Implement POST /api/assets**

```typescript
// src/app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ServiceType } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { project_id, service_type, name, r2_key, file_type, metadata } = body as {
    project_id?: string; service_type?: ServiceType; name?: string; r2_key?: string; file_type?: string; metadata?: Record<string, unknown>
  }
  if (!project_id || !service_type || !name || !r2_key || !file_type) {
    return NextResponse.json({ error: 'project_id, service_type, name, r2_key, file_type are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('Prv_assets')
    .insert({ project_id, service_type, name, r2_key, file_type, metadata: metadata ?? {} })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 4: Implement DELETE /api/assets/[id]**

```typescript
// src/app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteR2Object } from '@/lib/r2'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('Prv_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'internal') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  // Get asset to retrieve r2_key before deleting
  const { data: asset, error: fetchError } = await admin
    .from('Prv_assets')
    .select('id, r2_key')
    .eq('id', params.id)
    .single()
  if (fetchError || !asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

  // Delete from R2 (best effort — don't fail if R2 delete fails)
  try { await deleteR2Object(asset.r2_key) } catch (_) {}

  const { error } = await admin.from('Prv_assets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest --no-coverage __tests__/api/assets.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/assets/ __tests__/api/assets.test.ts
git commit -m "feat: add asset save + delete API routes"
```

---

## Task 7: Dashboard Layout — Sidebar Navigation

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Create the Sidebar component**

This is a Client Component because it uses `usePathname()` for active link highlighting.

```typescript
// src/components/dashboard/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PrvClient } from '@/lib/types/database'
import { LayoutDashboard, Users, LogOut } from 'lucide-react'

interface SidebarProps {
  clients: Pick<PrvClient, 'id' | 'name' | 'slug'>[]
}

export function Sidebar({ clients }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight">TDGame Preview</span>
        <span className="ml-2 text-xs text-gray-400">Internal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-gray-700 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          )}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>

        <div className="pt-4">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Clients
          </p>
          <Link
            href="/dashboard/clients"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === '/dashboard/clients'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Users size={16} />
            All Clients
          </Link>

          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className={cn(
                'flex items-center px-3 py-2 pl-9 rounded-md text-sm transition-colors',
                pathname.startsWith(`/dashboard/clients/${client.id}`)
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              {client.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Install lucide-react (icons)**

```bash
npm install lucide-react
```

- [ ] **Step 3: Update Dashboard Layout to include Sidebar**

```typescript
// src/app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import type { PrvClient } from '@/lib/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Auth guard (belt-and-suspenders after middleware)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch clients for sidebar
  const { data: clients } = await supabase
    .from('Prv_clients')
    .select('id, name, slug')
    .order('name') as { data: Pick<PrvClient, 'id' | 'name' | 'slug'>[] | null }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar clients={clients ?? []} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Add logout route**

```typescript
// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', _request.url))
}
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/components/dashboard/sidebar.tsx src/app/api/auth/logout/route.ts package.json package-lock.json
git commit -m "feat: add dashboard sidebar navigation with client list"
```

---

## Task 8: Clients Pages (List + Create + Detail)

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/page.tsx`
- Create: `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- Create: `src/components/dashboard/client-form.tsx`
- Create: `src/components/dashboard/project-form.tsx`

- [ ] **Step 1: Create ClientForm component (dialog)**

```typescript
// src/components/dashboard/client-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient, updateClient } from '@/lib/actions/clients'
import type { PrvClient } from '@/lib/types/database'

interface ClientFormProps {
  mode: 'create' | 'edit'
  client?: PrvClient
  trigger?: React.ReactNode
}

export function ClientForm({ mode, client, trigger }: ClientFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(client?.name ?? '')
  const [slug, setSlug] = useState(client?.slug ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = mode === 'create'
      ? await createClient({ name, slug })
      : await updateClient(client!.id, { name, slug })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>{mode === 'create' ? 'Add Client' : 'Edit'}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Client' : 'Edit Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Acme Studio" />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} required placeholder="acme-studio" pattern="[a-z0-9-]+" />
            <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only.</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving…' : mode === 'create' ? 'Create Client' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create ProjectForm component**

```typescript
// src/components/dashboard/project-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProject } from '@/lib/actions/projects'

interface ProjectFormProps {
  clientId: string
  trigger?: React.ReactNode
}

export function ProjectForm({ clientId, trigger }: ProjectFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createProject({ client_id: clientId, name, description: description || null })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setOpen(false)
    setName('')
    setDescription('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>New Project</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="proj-name">Project Name</Label>
            <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Hero Pack v2" />
          </div>
          <div>
            <Label htmlFor="proj-desc">Description (optional)</Label>
            <Input id="proj-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating…' : 'Create Project'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create Clients List page**

```typescript
// src/app/(dashboard)/dashboard/clients/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/dashboard/client-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { deleteClient } from '@/lib/actions/clients'
import type { PrvClient } from '@/lib/types/database'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('Prv_clients')
    .select('*')
    .order('name') as { data: PrvClient[] | null }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <ClientForm mode="create" />
      </div>

      {!clients?.length ? (
        <p className="text-gray-500">No clients yet. Add your first client above.</p>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between px-6 py-4">
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/{client.slug}</span>
                <ClientForm mode="edit" client={client} trigger={<Button variant="ghost" size="sm">Edit</Button>} />
                <form action={async () => { 'use server'; await deleteClient(client.id) }}>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">Delete</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create Client Detail page**

```typescript
// src/app/(dashboard)/dashboard/clients/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectForm } from '@/components/dashboard/project-form'
import { Badge } from '@/components/ui/badge'
import { deleteProject } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
import type { PrvClient, PrvProject } from '@/lib/types/database'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('Prv_clients')
    .select('*')
    .eq('id', params.id)
    .single() as { data: PrvClient | null }

  if (!client) notFound()

  const { data: projects } = await supabase
    .from('Prv_projects')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false }) as { data: PrvProject[] | null }

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Client</p>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-gray-400 text-sm">/{client.slug}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <ProjectForm clientId={client.id} />
      </div>

      {!projects?.length ? (
        <p className="text-gray-500">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/dashboard/clients/${client.id}/projects/${project.id}`}
                    className="font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                  )}
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">
                  {project.share_enabled ? '🔗 Shared' : 'Private'}
                </span>
                <form action={async () => { 'use server'; await deleteProject(project.id, client.id) }}>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">Delete</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors (or only warnings about unused vars).

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/clients/ src/components/dashboard/client-form.tsx src/components/dashboard/project-form.tsx
git commit -m "feat: add client list + detail pages, client/project forms"
```

---

## Task 9: Project Detail — Tabs + Asset Grid + Settings

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx`
- Create: `src/components/dashboard/asset-grid.tsx`
- Create: `src/components/dashboard/project-settings-form.tsx`
- Create: `src/components/dashboard/asset-upload.tsx`

- [ ] **Step 1: Create ProjectSettingsForm**

```typescript
// src/components/dashboard/project-settings-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateProject } from '@/lib/actions/projects'
import type { PrvProject } from '@/lib/types/database'

const SPINE_VERSIONS = ['4.2', '4.1', '4.0', '3.8', '3.7']

interface ProjectSettingsFormProps {
  project: PrvProject
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter()
  const [spineVersion, setSpineVersion] = useState(project.spine_version ?? '')
  const [shareEnabled, setShareEnabled] = useState(project.share_enabled)
  const [status, setStatus] = useState(project.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateProject(project.id, {
      spine_version: spineVersion || null,
      share_enabled: shareEnabled,
      status,
    })
    setSaving(false)
    if (result.error) { setMessage(`Error: ${result.error}`); return }
    setMessage('Saved!')
    router.refresh()
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <Label>Spine Version (for Animation assets)</Label>
        <Select value={spineVersion} onValueChange={setSpineVersion}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select version…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {SPINE_VERSIONS.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Public Share Link</Label>
          <p className="text-sm text-gray-500">Allow anonymous access via token URL</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shareEnabled}
          onClick={() => setShareEnabled(!shareEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shareEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {shareEnabled && project.share_token && (
        <div className="p-3 bg-blue-50 rounded text-sm break-all">
          <span className="font-medium">Share URL: </span>
          <a href={`/share/${project.share_token}`} className="text-blue-600 hover:underline" target="_blank">
            /share/{project.share_token}
          </a>
        </div>
      )}

      <div>
        <Label>Project Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'archived')}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <p className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create AssetUpload component**

```typescript
// src/components/dashboard/asset-upload.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ServiceType } from '@/lib/types/database'

interface AssetUploadProps {
  projectId: string
  serviceType: ServiceType
}

const ACCEPTED_TYPES: Record<ServiceType, string[]> = {
  art: ['image/png', 'image/jpeg', 'image/psd', 'application/octet-stream'],
  animation: ['application/json', 'application/octet-stream', 'text/plain'],
  vfx: ['image/gif', 'video/mp4', 'video/webm', 'application/octet-stream'],
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
    setProgress(`Preparing upload for ${file.name}…`)

    try {
      const ext = getExtension(file.name)
      // Generate a unique key in R2
      const uniqueKey = `assets/${projectId}/${Date.now()}-${file.name}`

      // 1. Get presigned PUT URL from our API
      setProgress('Getting upload URL…')
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: uniqueKey, contentType: file.type || 'application/octet-stream' }),
      })
      if (!presignRes.ok) throw new Error('Failed to get upload URL')
      const { url } = await presignRes.json()

      // 2. Upload directly to R2 via presigned URL
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

      setProgress(`✓ ${file.name} uploaded successfully`)
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
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
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
      {progress && !error && <p className="text-sm text-green-600">{progress}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create AssetGrid component**

```typescript
// src/components/dashboard/asset-grid.tsx
import { createClient } from '@/lib/supabase/server'
import { AssetUpload } from '@/components/dashboard/asset-upload'
import { Button } from '@/components/ui/button'
import type { PrvAsset, ServiceType } from '@/lib/types/database'

interface AssetGridProps {
  projectId: string
  serviceType: ServiceType
}

export async function AssetGrid({ projectId, serviceType }: AssetGridProps) {
  const supabase = await createClient()
  const { data: assets } = await supabase
    .from('Prv_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)
    .order('sort_order')
    .order('created_at') as { data: PrvAsset[] | null }

  return (
    <div className="space-y-6">
      <AssetUpload projectId={projectId} serviceType={serviceType} />

      {!assets?.length ? (
        <p className="text-gray-400 text-sm">No {serviceType} assets yet. Upload above.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg shadow overflow-hidden group">
              {/* Placeholder thumbnail — asset preview handled in P3 */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <span className="text-3xl">
                  {serviceType === 'art' ? '🖼️' : serviceType === 'animation' ? '🦴' : '🎬'}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate" title={asset.name}>{asset.name}</p>
                <p className="text-xs text-gray-400 uppercase">{asset.file_type}</p>
              </div>
              <div className="px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <form action={`/api/assets/${asset.id}`} method="DELETE">
                  <Button variant="ghost" size="sm" className="text-red-500 w-full text-xs">Delete</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create Project Detail page with tabs**

```typescript
// src/app/(dashboard)/dashboard/clients/[id]/projects/[pid]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetGrid } from '@/components/dashboard/asset-grid'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import { Badge } from '@/components/ui/badge'
import type { PrvProject, PrvClient } from '@/lib/types/database'

export default async function ProjectDetailPage({
  params
}: {
  params: { id: string; pid: string }
}) {
  const supabase = await createClient()

  const [{ data: client }, { data: project }] = await Promise.all([
    supabase.from('Prv_clients').select('id, name').eq('id', params.id).single() as Promise<{ data: Pick<PrvClient, 'id' | 'name'> | null }>,
    supabase.from('Prv_projects').select('*').eq('id', params.pid).single() as Promise<{ data: PrvProject | null }>,
  ])

  if (!client || !project) notFound()

  return (
    <div className="p-8">
      {/* Breadcrumb */}
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
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="art">
          <AssetGrid projectId={project.id} serviceType="art" />
        </TabsContent>

        <TabsContent value="animation">
          <AssetGrid projectId={project.id} serviceType="animation" />
        </TabsContent>

        <TabsContent value="vfx">
          <AssetGrid projectId={project.id} serviceType="vfx" />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettingsForm project={project} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors found before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/clients/[id]/projects/ src/components/dashboard/
git commit -m "feat: project detail page with Art/Animation/VFX/Settings tabs + asset upload"
```

---

## Task 10: Dashboard Overview Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard overview page with stats**

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { PrvClient, PrvProject, PrvAsset } from '@/lib/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    { count: projectCount },
    { count: assetCount },
    { data: recentAssets },
  ] = await Promise.all([
    supabase.from('Prv_clients').select('*', { count: 'exact', head: true }),
    supabase.from('Prv_projects').select('*', { count: 'exact', head: true }),
    supabase.from('Prv_assets').select('*', { count: 'exact', head: true }),
    supabase
      .from('Prv_assets')
      .select('id, name, file_type, service_type, created_at, project_id, Prv_projects(name, client_id, Prv_clients(name))')
      .order('created_at', { ascending: false })
      .limit(10) as Promise<{ data: (PrvAsset & { Prv_projects: { name: string; Prv_clients: { name: string } } | null })[] | null }>,
  ])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Clients', value: clientCount ?? 0, href: '/dashboard/clients' },
          { label: 'Projects', value: projectCount ?? 0, href: '/dashboard/clients' },
          { label: 'Assets', value: assetCount ?? 0, href: '#' },
        ].map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent uploads */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Recent Uploads</h2>
        </div>
        {!recentAssets?.length ? (
          <p className="px-6 py-4 text-gray-400 text-sm">No uploads yet.</p>
        ) : (
          <ul className="divide-y">
            {recentAssets.map((asset) => (
              <li key={asset.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-gray-400">
                    {asset.Prv_projects?.Prv_clients?.name} — {asset.Prv_projects?.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    asset.service_type === 'art' ? 'bg-purple-100 text-purple-700' :
                    asset.service_type === 'animation' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {asset.service_type}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(asset.created_at).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
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

- [ ] **Step 3: Full test run**

```bash
npx jest --no-coverage
```

Expected: All tests pass (11 existing + new tests for actions + API routes).

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: dashboard overview with client/project/asset stats + recent uploads"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/dashboard` → Overview with stats + recent uploads (Task 10)
- ✅ `/dashboard/clients` → Client list + create (Task 8)
- ✅ `/dashboard/clients/[id]` → Client detail + project list (Task 8)
- ✅ `/dashboard/clients/[id]/projects/[pid]` → Project detail with tabs (Task 9)
- ✅ Art/Animation/VFX tabs with upload (Task 9)
- ✅ Settings tab: spine_version, share_enabled, status (Task 9)
- ✅ R2 upload flow: presign → browser direct upload → save record (Tasks 5, 6, 9)
- ✅ Dashboard sidebar with client list (Task 7)

**Note on route change:** The spec shows `/dashboard/clients/[id]/[pid]` but this plan uses `/dashboard/clients/[id]/projects/[pid]` — the extra `projects/` segment avoids Next.js route conflicts and makes URLs clearer. This is a minor intentional deviation.

**Placeholder scan:** All tasks include concrete code. No "TBD" items.

**Type consistency:**
- `ActionResult<T>` defined once and used consistently
- `PrvClient`, `PrvProject`, `PrvAsset` from `@/lib/types/database` throughout
- `ServiceType` used correctly as `'art' | 'animation' | 'vfx'`
