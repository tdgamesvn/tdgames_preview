# P1: Foundation + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the TDGame Preview app với Next.js 14, Supabase auth, database schema + RLS, và role-based route protection.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind. Auth qua Supabase email/password. Middleware Next.js protect routes: `internal` → `/dashboard`, `client` → `/portal`, anonymous → `/share/[token]`. Supabase SSR client dùng `@supabase/ssr`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (`@supabase/ssr`), Jest + React Testing Library

---

## File Structure

```
/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── jest.config.ts
├── jest.setup.ts
├── middleware.ts                        # Route protection
├── supabase/
│   └── migrations/
│       └── 20260605000000_initial.sql  # Tables + RLS
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Root redirect (→ dashboard or portal)
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Requires internal role
│   │   │   └── page.tsx                # Stub: "Dashboard"
│   │   ├── (portal)/
│   │   │   ├── layout.tsx              # Requires client role
│   │   │   └── page.tsx                # Stub: "Portal"
│   │   └── share/
│   │       └── [token]/
│   │           └── page.tsx            # Stub: public share
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server-side Supabase client (RSC/API)
│   │   │   └── middleware-client.ts    # Middleware Supabase client
│   │   └── types/
│   │       └── database.ts             # Hand-written DB types from schema
│   └── components/
│       └── auth/
│           └── login-form.tsx          # Email+password form, server action
├── __tests__/
│   ├── components/
│   │   └── login-form.test.tsx
│   └── lib/
│       └── supabase-middleware.test.ts
```

---

## Task 1: Bootstrap Next.js 14 project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `jest.config.ts`, `jest.setup.ts`

- [ ] **Step 1.1: Tạo Next.js app**

Chạy trong thư mục `/Users/tdgames_mac01/Work/apps/tdgames_preview`:

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Khi hỏi "Would you like to use..." → chọn Yes cho tất cả.

- [ ] **Step 1.2: Cài thêm dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 1.3: Cài shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

Chọn: `Default` style, `zinc` base color, `yes` CSS variables.

Sau đó thêm các components cần cho login:

```bash
npx shadcn@latest add button input label card form
```

- [ ] **Step 1.4: Tạo `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
}

export default createJestConfig(config)
```

- [ ] **Step 1.5: Tạo `jest.setup.ts`**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 1.6: Tạo `.env.example`**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=tdgames-preview
R2_PUBLIC_URL=https://your-r2-domain.com
```

Tạo `.env.local` từ `.env.example` và điền giá trị thật.

- [ ] **Step 1.7: Verify project chạy được**

```bash
npm run dev
```

Expected: Server starts tại `http://localhost:3000` không có errors.

- [ ] **Step 1.8: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js 14 + Supabase + shadcn/ui + Jest"
```

---

## Task 2: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware-client.ts`
- Create: `src/lib/types/database.ts`

- [ ] **Step 2.1: Tạo `src/lib/types/database.ts`**

```typescript
// src/lib/types/database.ts
export type UserRole = 'internal' | 'client'
export type ServiceType = 'art' | 'animation' | 'vfx'
export type ProjectStatus = 'active' | 'archived'

export interface PrvProfile {
  id: string
  role: UserRole
  client_id: string | null
  display_name: string
  created_at: string
}

export interface PrvClient {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface PrvProject {
  id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  spine_version: string | null
  share_enabled: boolean
  share_token: string | null
  created_at: string
}

export interface PrvAsset {
  id: string
  project_id: string
  service_type: ServiceType
  name: string
  r2_key: string
  file_type: string
  metadata: Record<string, unknown>
  sort_order: number
  created_at: string
}

export interface PrvComment {
  id: string
  project_id: string
  asset_id: string | null
  author_id: string
  content: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      Prv_profiles: { Row: PrvProfile; Insert: Omit<PrvProfile, 'created_at'>; Update: Partial<PrvProfile> }
      Prv_clients: { Row: PrvClient; Insert: Omit<PrvClient, 'id' | 'created_at'>; Update: Partial<PrvClient> }
      Prv_projects: { Row: PrvProject; Insert: Omit<PrvProject, 'id' | 'created_at'>; Update: Partial<PrvProject> }
      Prv_assets: { Row: PrvAsset; Insert: Omit<PrvAsset, 'id' | 'created_at'>; Update: Partial<PrvAsset> }
      Prv_comments: { Row: PrvComment; Insert: Omit<PrvComment, 'id' | 'created_at'>; Update: Partial<PrvComment> }
    }
  }
}
```

- [ ] **Step 2.2: Tạo `src/lib/supabase/client.ts`** (browser-side)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2.3: Tạo `src/lib/supabase/server.ts`** (RSC / Server Actions / Route Handlers)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 2.4: Tạo `src/lib/supabase/middleware-client.ts`**

```typescript
// src/lib/supabase/middleware-client.ts
import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/
git commit -m "feat: add Supabase SSR clients and DB types"
```

---

## Task 3: Database Migration SQL

**Files:**
- Create: `supabase/migrations/20260605000000_initial.sql`

- [ ] **Step 3.1: Tạo thư mục migrations**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 3.2: Tạo `supabase/migrations/20260605000000_initial.sql`**

```sql
-- supabase/migrations/20260605000000_initial.sql

-- Enums
CREATE TYPE user_role AS ENUM ('internal', 'client');
CREATE TYPE service_type AS ENUM ('art', 'animation', 'vfx');
CREATE TYPE project_status AS ENUM ('active', 'archived');

-- Clients
CREATE TABLE "Prv_clients" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  logo_url   text,
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE "Prv_profiles" (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'client',
  client_id    uuid REFERENCES "Prv_clients"(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE "Prv_projects" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES "Prv_clients"(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  status        project_status NOT NULL DEFAULT 'active',
  spine_version text,
  share_enabled bool NOT NULL DEFAULT false,
  share_token   text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at    timestamptz DEFAULT now()
);

-- Assets
CREATE TABLE "Prv_assets" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES "Prv_projects"(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  name         text NOT NULL,
  r2_key       text NOT NULL,
  file_type    text NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}',
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Comments
CREATE TABLE "Prv_comments" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES "Prv_projects"(id) ON DELETE CASCADE,
  asset_id   uuid REFERENCES "Prv_assets"(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE "Prv_clients"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_assets"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prv_comments" ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM "Prv_profiles" WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's client_id
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS uuid AS $$
  SELECT client_id FROM "Prv_profiles" WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prv_clients: internal = full CRUD, client = SELECT own
CREATE POLICY "clients_internal_all"   ON "Prv_clients" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "clients_client_select"  ON "Prv_clients" FOR SELECT USING (id = get_my_client_id());

-- Prv_profiles: own row always, internal sees all
CREATE POLICY "profiles_own"           ON "Prv_profiles" FOR ALL    USING (id = auth.uid());
CREATE POLICY "profiles_internal_all"  ON "Prv_profiles" FOR ALL    USING (get_my_role() = 'internal');

-- Prv_projects: internal = full CRUD, client = SELECT own, anonymous = SELECT when share enabled
CREATE POLICY "projects_internal_all"  ON "Prv_projects" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "projects_client_select" ON "Prv_projects" FOR SELECT USING (client_id = get_my_client_id());
CREATE POLICY "projects_share_select"  ON "Prv_projects" FOR SELECT USING (share_enabled = true AND auth.uid() IS NULL);

-- Prv_assets: mirrors project access
CREATE POLICY "assets_internal_all"    ON "Prv_assets" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "assets_client_select"   ON "Prv_assets" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.client_id = get_my_client_id())
);
CREATE POLICY "assets_share_select"    ON "Prv_assets" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.share_enabled = true)
  AND auth.uid() IS NULL
);

-- Prv_comments: internal = full CRUD, client = SELECT + INSERT own, share = SELECT only
CREATE POLICY "comments_internal_all"   ON "Prv_comments" FOR ALL    USING (get_my_role() = 'internal');
CREATE POLICY "comments_client_select"  ON "Prv_comments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.client_id = get_my_client_id())
);
CREATE POLICY "comments_client_insert"  ON "Prv_comments" FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_share_select"   ON "Prv_comments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Prv_projects" p WHERE p.id = project_id AND p.share_enabled = true)
  AND auth.uid() IS NULL
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO "Prv_profiles" (id, role, display_name)
  VALUES (NEW.id, 'client', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 3.3: Apply migration lên Supabase**

Có 2 cách:

**Option A — Supabase CLI (recommended nếu đã cài):**
```bash
supabase db push
```

**Option B — Supabase Dashboard:**
- Mở SQL Editor tại `https://supabase.com/dashboard/project/<your-project>/sql`
- Paste toàn bộ nội dung file SQL trên và chạy

- [ ] **Step 3.4: Verify tables đã được tạo**

Trong Supabase Dashboard → Table Editor, kiểm tra 5 bảng:
- `Prv_clients`, `Prv_profiles`, `Prv_projects`, `Prv_assets`, `Prv_comments`

- [ ] **Step 3.5: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema and RLS policies"
```

---

## Task 4: Login Page + Auth Form

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `__tests__/components/login-form.test.tsx`

- [ ] **Step 4.1: Write failing test**

```typescript
// __tests__/components/login-form.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/login-form'

// Mock Supabase browser client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      }),
    },
  }),
}))

describe('LoginForm', () => {
  it('renders email, password fields and submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error message on failed login', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: Run test — expect FAIL**

```bash
npx jest __tests__/components/login-form.test.tsx --no-coverage
```

Expected: `FAIL — Cannot find module '@/components/auth/login-form'`

- [ ] **Step 4.3: Tạo `src/components/auth/login-form.tsx`**

```typescript
// src/components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>TDGame Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4.4: Tạo `src/app/(auth)/login/page.tsx`**

```typescript
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </main>
  )
}
```

- [ ] **Step 4.5: Run test — expect PASS**

```bash
npx jest __tests__/components/login-form.test.tsx --no-coverage
```

Expected: `PASS` (2 tests)

- [ ] **Step 4.6: Commit**

```bash
git add src/components/auth/ src/app/\(auth\)/ __tests__/components/
git commit -m "feat: add login page and LoginForm component"
```

---

## Task 5: Middleware — Route Protection

**Files:**
- Create: `middleware.ts`
- Create: `__tests__/lib/supabase-middleware.test.ts`

Logic:
- `/dashboard*` → phải là `internal` role → nếu không: redirect `/login`
- `/portal*` → phải là `client` role → nếu không: redirect `/login`
- `/share/*` → public, không cần auth
- `/login` → nếu đã login: redirect `/`
- `/` → redirect dựa trên role

- [ ] **Step 5.1: Write failing test**

```typescript
// __tests__/lib/supabase-middleware.test.ts
import { getRedirectPath } from '@/lib/supabase/get-redirect-path'

describe('getRedirectPath', () => {
  it('unauthenticated user on /dashboard → /login', () => {
    expect(getRedirectPath(null, '/dashboard')).toBe('/login')
  })

  it('unauthenticated user on /portal → /login', () => {
    expect(getRedirectPath(null, '/portal')).toBe('/login')
  })

  it('internal user on /dashboard → null (allow)', () => {
    expect(getRedirectPath('internal', '/dashboard/clients')).toBeNull()
  })

  it('client user on /dashboard → /portal (wrong role)', () => {
    expect(getRedirectPath('client', '/dashboard')).toBe('/portal')
  })

  it('internal user on /portal → /dashboard (wrong role)', () => {
    expect(getRedirectPath('internal', '/portal')).toBe('/dashboard')
  })

  it('logged-in user on /login → / (already authed)', () => {
    expect(getRedirectPath('internal', '/login')).toBe('/')
  })

  it('unauthenticated user on /share/abc → null (public)', () => {
    expect(getRedirectPath(null, '/share/abc')).toBeNull()
  })

  it('root / → /dashboard for internal', () => {
    expect(getRedirectPath('internal', '/')).toBe('/dashboard')
  })

  it('root / → /portal for client', () => {
    expect(getRedirectPath('client', '/')).toBe('/portal')
  })
})
```

- [ ] **Step 5.2: Run test — expect FAIL**

```bash
npx jest __tests__/lib/supabase-middleware.test.ts --no-coverage
```

Expected: `FAIL — Cannot find module '@/lib/supabase/get-redirect-path'`

- [ ] **Step 5.3: Tạo `src/lib/supabase/get-redirect-path.ts`**

```typescript
// src/lib/supabase/get-redirect-path.ts
import type { UserRole } from '@/lib/types/database'

/**
 * Determines where to redirect based on user role and current path.
 * Returns null if no redirect is needed (allow through).
 */
export function getRedirectPath(
  role: UserRole | null,
  pathname: string
): string | null {
  const isAuthed = role !== null

  // Public routes — always allow
  if (pathname.startsWith('/share/')) return null

  // Already on login → redirect if authed
  if (pathname === '/login') {
    return isAuthed ? '/' : null
  }

  // Root → role-based redirect
  if (pathname === '/') {
    if (role === 'internal') return '/dashboard'
    if (role === 'client') return '/portal'
    return '/login'
  }

  // Dashboard → internal only
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthed) return '/login'
    if (role === 'client') return '/portal'
    return null
  }

  // Portal → client only
  if (pathname.startsWith('/portal')) {
    if (!isAuthed) return '/login'
    if (role === 'internal') return '/dashboard'
    return null
  }

  return null
}
```

- [ ] **Step 5.4: Run test — expect PASS**

```bash
npx jest __tests__/lib/supabase-middleware.test.ts --no-coverage
```

Expected: `PASS` (9 tests)

- [ ] **Step 5.5: Tạo `middleware.ts`**

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { getRedirectPath } from '@/lib/supabase/get-redirect-path'
import type { UserRole } from '@/lib/types/database'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // Refresh session (keeps auth cookies up to date)
  const { data: { user } } = await supabase.auth.getUser()

  let role: UserRole | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('Prv_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  const pathname = request.nextUrl.pathname
  const redirectTo = getRedirectPath(role, pathname)

  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 5.6: Commit**

```bash
git add middleware.ts src/lib/supabase/get-redirect-path.ts __tests__/lib/
git commit -m "feat: add route protection middleware with role-based redirects"
```

---

## Task 6: Stub Pages + Layouts

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/app/(portal)/layout.tsx`
- Create: `src/app/(portal)/page.tsx`
- Create: `src/app/share/[token]/page.tsx`

- [ ] **Step 6.1: Update `src/app/layout.tsx`**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TDGame Preview',
  description: 'Private preview portal for TDGame Studio clients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6.2: Tạo `src/app/page.tsx`** (root redirect — handled by middleware, page là fallback)

```typescript
// src/app/page.tsx
// This page is never rendered directly — middleware redirects / to /dashboard or /portal.
// If somehow reached, redirect to login as a safety fallback.
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
```

- [ ] **Step 6.3: Tạo `src/app/(dashboard)/layout.tsx`**

```typescript
// src/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dashboard nav will be added in P2 */}
      {children}
    </div>
  )
}
```

- [ ] **Step 6.4: Tạo `src/app/(dashboard)/page.tsx`**

```typescript
// src/app/(dashboard)/page.tsx
export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-500 mt-2">Internal team dashboard — coming in P2.</p>
    </main>
  )
}
```

- [ ] **Step 6.5: Tạo `src/app/(portal)/layout.tsx`**

```typescript
// src/app/(portal)/layout.tsx
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Portal nav will be added in P4 */}
      {children}
    </div>
  )
}
```

- [ ] **Step 6.6: Tạo `src/app/(portal)/page.tsx`**

```typescript
// src/app/(portal)/page.tsx
export default function PortalPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Client Portal</h1>
      <p className="text-gray-500 mt-2">Your projects — coming in P4.</p>
    </main>
  )
}
```

- [ ] **Step 6.7: Tạo `src/app/share/[token]/page.tsx`**

```typescript
// src/app/share/[token]/page.tsx
interface Props {
  params: Promise<{ token: string }>
}

export default async function SharePage({ params }: Props) {
  const { token } = await params
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Shared Preview</h1>
      <p className="text-gray-500 mt-2">Token: {token} — coming in P4.</p>
    </main>
  )
}
```

- [ ] **Step 6.8: Commit**

```bash
git add src/app/
git commit -m "feat: add stub pages and layouts for dashboard, portal, share"
```

---

## Task 7: Full Test Run + Smoke Test

- [ ] **Step 7.1: Chạy toàn bộ test suite**

```bash
npx jest --no-coverage
```

Expected:
```
PASS __tests__/components/login-form.test.tsx
PASS __tests__/lib/supabase-middleware.test.ts

Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

- [ ] **Step 7.2: Build production check**

```bash
npm run build
```

Expected: Build hoàn tất không có TypeScript errors hay Next.js warnings.

- [ ] **Step 7.3: Manual smoke test**

```bash
npm run dev
```

Kiểm tra:
1. `http://localhost:3000` → redirect đến `/login` ✓
2. Nhập sai email/pass → hiện error message ✓
3. Nhập đúng credentials của internal user → redirect `/dashboard` ✓
4. Nhập đúng credentials của client user → redirect `/portal` ✓
5. Truy cập `/share/test-token` không cần login → hiện stub page ✓
6. Truy cập `/dashboard` khi không login → redirect `/login` ✓

- [ ] **Step 7.4: Final commit**

```bash
git add -A
git commit -m "chore: verify P1 complete — all tests pass, smoke test OK"
```

---

## Checklist sau khi xong P1

- [ ] `npm run build` passes
- [ ] `npx jest` passes (11 tests)
- [ ] Login flow hoạt động trên localhost
- [ ] Role-based redirect đúng (internal → dashboard, client → portal)
- [ ] DB schema đã được apply lên Supabase
- [ ] `.env.local` đã được điền đủ (không commit file này)

**Sẵn sàng cho:**
- P2: Internal Dashboard (cần P1 ✓)
- P3: Asset Preview System (cần P1 ✓)
