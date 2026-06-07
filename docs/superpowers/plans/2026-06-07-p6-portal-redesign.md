# P6: Portal Redesign — Character-First Showcase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the client portal (`/portal/*`) to feel like a cinematic game studio showcase — impressive, atmospheric, focused on viewing experience.

**Architecture:** Visual-only redesign — no new DB columns or API routes. Spine animation on cards and full animation gallery already work; this plan upgrades the visual presentation of all 3 portal pages and replaces the tab-based character detail with a single-scroll showcase.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons. Existing: `SpineAvatarPreview`, `SpineAnimationGallery`, `ImageLightbox`, `Comments`, `AssetGridClient` — reused unchanged.

---

## File Map

**New files:**
- `src/components/portal/section-header.tsx` — reusable label row (`ART · 12`)
- `src/components/portal/portal-project-card.tsx` — cinematic project card (cover art + hover glow)
- `src/components/portal/comments-drawer.tsx` — fixed right-side drawer wrapping `<Comments>`
- `src/components/portal/roster-client.tsx` — client component: search filter + grid
- `src/components/portal/showcase-hero.tsx` — Zone A: full-bleed Spine/Art/placeholder hero
- `src/components/portal/art-filmstrip.tsx` — Zone B: horizontal scroll art strip

**Modified files:**
- `src/app/(portal)/layout.tsx` — darker bg `#080808`, grain texture CSS
- `src/app/(portal)/portal/page.tsx` — use `PortalProjectCard`, fetch cover art per project
- `src/app/(portal)/portal/[pid]/page.tsx` — remove Tabs, add search + drawer
- `src/app/(portal)/portal/[pid]/characters/[cid]/page.tsx` — remove Tabs, render scroll zones A–E
- `src/components/dashboard/character-card-item.tsx` — visual upgrade (hover glow, footer slide-up)
- `src/components/dashboard/spine-animation-gallery.tsx` — visual upgrade (larger cells, remove dropdowns → pill buttons)
- `src/components/dashboard/spine-avatar-preview.tsx` — add `forwardRef` to expose `setAnimation()` imperatively

**Test files:**
- `__tests__/components/portal/roster-client.test.tsx`
- `__tests__/components/portal/comments-drawer.test.tsx`
- `__tests__/components/portal/showcase-hero.test.tsx`

---

## Task 1: Portal layout — dark atmosphere + grain texture

**Files:**
- Modify: `src/app/(portal)/layout.tsx`

- [ ] **Step 1: Update layout background and add grain**

Replace the layout body:

```tsx
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'display_name'> | null }

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      {/* Grain texture overlay — covers entire page */}
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
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#555' }}>
            {profile?.display_name ?? user.email}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-[10px] font-black uppercase tracking-wider transition-colors"
              style={{ color: '#444' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444' }}
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Build to check no errors**

```bash
npx next build 2>&1 | tail -5
```
Expected: clean build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(portal\)/layout.tsx
git commit -m "feat(portal): darker bg + grain texture overlay"
```

---

## Task 2: SectionHeader component

**Files:**
- Create: `src/components/portal/section-header.tsx`

No test needed — trivial presentational component.

- [ ] **Step 1: Create SectionHeader**

```tsx
// src/components/portal/section-header.tsx

interface SectionHeaderProps {
  label: string
  count?: number
  action?: React.ReactNode
}

export function SectionHeader({ label, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#FF9500' }}
        >
          {label}
        </span>
        {count !== undefined && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#555' }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/section-header.tsx
git commit -m "feat(portal): SectionHeader reusable label component"
```

---

## Task 3: PortalProjectCard + upgrade /portal page

**Files:**
- Create: `src/components/portal/portal-project-card.tsx`
- Modify: `src/app/(portal)/portal/page.tsx`

- [ ] **Step 1: Create PortalProjectCard**

```tsx
// src/components/portal/portal-project-card.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PrvProject } from '@/lib/types/database'

interface PortalProjectCardProps {
  project: PrvProject
  coverUrl?: string       // presigned URL of first character's first art asset
  characterCount: number
}

export function PortalProjectCard({ project, coverUrl, characterCount }: PortalProjectCardProps) {
  const [imgError, setImgError] = useState(false)
  const showCover = Boolean(coverUrl) && !imgError

  return (
    <Link
      href={`/portal/${project.id}`}
      className="group block rounded-2xl overflow-hidden"
      style={{ aspectRatio: '16/9', position: 'relative' }}
    >
      {/* Cover image */}
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={project.name}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.05)',
            transition: 'transform 600ms ease',
          }}
          className="group-hover:scale-110"
        />
      ) : (
        /* Gradient fallback */
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,149,0,0.06) 0%, rgba(255,149,0,0.02) 50%, #080808 100%)',
          }}
        >
          <span
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '5rem', fontWeight: 900,
              color: 'rgba(255,149,0,0.08)',
              userSelect: 'none', letterSpacing: '-0.05em',
              textTransform: 'uppercase',
            }}
          >
            {project.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient overlay — always on top of cover */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.3) 50%, transparent 100%)',
        }}
      />

      {/* Hover glow ring */}
      <div
        style={{
          position: 'absolute', inset: 0,
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 0 0 rgba(255,149,0,0)',
          transition: 'box-shadow 300ms ease, border-color 300ms ease',
        }}
        className="group-hover:[border-color:rgba(255,149,0,0.4)] group-hover:[box-shadow:0_0_40px_rgba(255,149,0,0.15)]"
      />

      {/* Text overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px' }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="font-black uppercase tracking-wider text-white leading-tight"
              style={{ fontSize: '0.9rem' }}
            >
              {project.name}
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: '#666' }}
            >
              {characterCount} character{characterCount !== 1 ? 's' : ''}
            </p>
          </div>
          <span
            className="text-[10px] font-black uppercase tracking-wider flex-shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
            style={{ color: '#FF9500' }}
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Rewrite /portal/page.tsx**

```tsx
// src/app/(portal)/portal/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPresignedGetUrl } from '@/lib/r2'
import { PortalProjectCard } from '@/components/portal/portal-project-card'
import type { PrvProfile, PrvProject, PrvAsset } from '@/lib/types/database'

export default async function PortalPage() {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, display_name')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'display_name'> | null }

  if (!profile?.client_id) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', fontSize: '1.5rem' }}
        >
          ⚠️
        </div>
        <div>
          <p className="text-sm font-semibold text-white">No client account linked</p>
          <p className="text-xs mt-1" style={{ color: '#555' }}>
            Please contact your studio contact to get access.
          </p>
        </div>
      </div>
    )
  }

  const { data: projects } = (await supabase
    .from('Prv_projects')
    .select('id, name, description, status, created_at, client_id')
    .eq('client_id', profile.client_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })) as { data: PrvProject[] | null }

  const projectList = projects ?? []

  // For each project: fetch character count + first character's first art presigned URL
  const projectData = await Promise.all(
    projectList.map(async (project) => {
      const [{ count }, { data: firstArt }] = await Promise.all([
        supabase
          .from('Prv_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id) as Promise<{ count: number | null }>,
        (supabase
          .from('Prv_assets')
          .select('r2_key')
          .eq('project_id', project.id)
          .eq('service_type', 'art')
          .order('created_at')
          .limit(1)) as Promise<{ data: Pick<PrvAsset, 'r2_key'>[] | null }>,
      ])
      let coverUrl: string | undefined
      if (firstArt?.[0]?.r2_key) {
        coverUrl = await getPresignedGetUrl(firstArt[0].r2_key).catch(() => undefined)
      }
      return { project, characterCount: count ?? 0, coverUrl }
    })
  )

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#FF9500' }}>
          Client Portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          {profile.display_name ? `${profile.display_name}` : 'Your Projects'}
        </h1>
        <p className="text-xs mt-1.5" style={{ color: '#444' }}>
          {projectList.length === 0
            ? 'No active projects yet'
            : `${projectList.length} active project${projectList.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Empty state */}
      {projectList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 gap-4 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No projects yet</p>
          <p className="text-xs" style={{ color: '#333' }}>
            Projects will appear here once your team uploads deliverables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectData.map(({ project, characterCount, coverUrl }) => (
            <PortalProjectCard
              key={project.id}
              project={project}
              coverUrl={coverUrl}
              characterCount={characterCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build check**

```bash
npx next build 2>&1 | tail -5
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/portal-project-card.tsx src/app/\(portal\)/portal/page.tsx
git commit -m "feat(portal): cinematic project cards with cover art"
```

---

## Task 4: CharacterCardItem visual upgrade

**Files:**
- Modify: `src/components/dashboard/character-card-item.tsx`

Card already plays Spine animation — only visual changes: glow hover, taller footer, "View →" reveal.

- [ ] **Step 1: Rewrite CharacterCardItem**

```tsx
// src/components/dashboard/character-card-item.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SpineAvatarPreview } from './spine-avatar-preview'
import type { PrvTask } from '@/lib/types/database'

export interface SpineCardConfig {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  skinName?: string
  scale: number
  offsetX: number
  offsetY: number
  spineVersion: string
}

interface CharacterCardItemProps {
  task: PrvTask
  href: string
  artUrl?: string
  spineConfig?: SpineCardConfig
}

export function CharacterCardItem({ task, href, artUrl, spineConfig }: CharacterCardItemProps) {
  const router = useRouter()
  const [spineError, setSpineError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const initial = task.name.charAt(0).toUpperCase()
  const showSpine = Boolean(spineConfig) && !spineError
  const showArt = !showSpine && Boolean(artUrl)
  const showPlaceholder = !showSpine && !showArt

  return (
    <div
      onClick={() => router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer rounded-2xl overflow-hidden flex flex-col w-full"
      style={{
        aspectRatio: '2/3',
        background: 'rgba(255,255,255,0.03)',
        border: hovered ? '1px solid rgba(255,149,0,0.45)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: hovered ? '0 8px 40px rgba(255,149,0,0.18), 0 0 0 1px rgba(255,149,0,0.1)' : 'none',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'border-color 250ms ease, box-shadow 250ms ease, transform 250ms ease',
      }}
    >
      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Spine bg color (use task.avatar_bg if set) */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: (task as any).avatar_bg && (task as any).avatar_bg !== '#00000000' // eslint-disable-line @typescript-eslint/no-explicit-any
              ? `#${((task as any).avatar_bg as string).slice(1, 7)}` // eslint-disable-line @typescript-eslint/no-explicit-any
              : 'rgba(255,255,255,0.02)',
          }}
        />
        {showSpine && (
          <SpineAvatarPreview
            {...spineConfig!}
            autoFit
            backgroundColor={(task as any).avatar_bg ?? '#00000000'} // eslint-disable-line @typescript-eslint/no-explicit-any
            onError={() => setSpineError(true)}
          />
        )}
        {showArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artUrl}
            alt={task.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
              style={{ background: 'rgba(255,149,0,0.1)', color: 'rgba(255,149,0,0.4)' }}
            >
              {initial}
            </div>
          </div>
        )}
      </div>

      {/* Name footer — reveals "View →" on hover */}
      <div
        className="px-3 shrink-0 flex items-center justify-between overflow-hidden"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          height: hovered ? '44px' : '36px',
          transition: 'height 250ms ease',
          background: hovered ? 'rgba(255,149,0,0.04)' : 'transparent',
        }}
      >
        <p className="text-xs font-semibold text-white truncate">{task.name}</p>
        <span
          className="text-[9px] font-black uppercase tracking-widest flex-shrink-0 ml-2 transition-opacity"
          style={{ color: '#FF9500', opacity: hovered ? 1 : 0 }}
        >
          View →
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check + tests**

```bash
npx next build 2>&1 | tail -5 && npx jest --no-coverage 2>&1 | tail -5
```
Expected: clean build, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/character-card-item.tsx
git commit -m "feat(portal): character card — glow hover + View arrow reveal"
```

---

## Task 5: CommentsDrawer + RosterClient + upgrade /portal/[pid] page

**Files:**
- Create: `src/components/portal/comments-drawer.tsx`
- Create: `src/components/portal/roster-client.tsx`
- Modify: `src/app/(portal)/portal/[pid]/page.tsx`
- Test: `__tests__/components/portal/comments-drawer.test.tsx`
- Test: `__tests__/components/portal/roster-client.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/portal/comments-drawer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CommentsDrawer } from '@/components/portal/comments-drawer'

jest.mock('@/components/preview/comments', () => ({
  Comments: ({ projectId }: { projectId: string }) => (
    <div data-testid="comments">{projectId}</div>
  ),
}))

describe('CommentsDrawer', () => {
  it('is closed by default', () => {
    render(<CommentsDrawer projectId="p1" />)
    expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
  })

  it('opens when trigger button clicked', () => {
    render(<CommentsDrawer projectId="p1" />)
    fireEvent.click(screen.getByRole('button', { name: /comments/i }))
    expect(screen.getByTestId('comments')).toBeInTheDocument()
  })

  it('closes when close button clicked', () => {
    render(<CommentsDrawer projectId="p1" />)
    fireEvent.click(screen.getByRole('button', { name: /comments/i }))
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
  })
})
```

```tsx
// __tests__/components/portal/roster-client.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { RosterClient } from '@/components/portal/roster-client'

// Minimal task shape for filter testing
const makeTasks = (names: string[]) =>
  names.map((name, i) => ({ id: String(i), name, project_id: 'proj', sort_order: i, created_at: '' }))

jest.mock('@/components/dashboard/character-card-grid', () => ({
  CharacterCardGrid: ({ tasks }: { tasks: { name: string }[] }) => (
    <div data-testid="grid">{tasks.map(t => <span key={t.name}>{t.name}</span>)}</div>
  ),
}))

// CharacterCardGrid is async server component — mock it as sync for tests
describe('RosterClient', () => {
  const tasks = makeTasks(['Alice', 'Bob', 'Charlie'])

  it('renders all characters when no search query', () => {
    render(<RosterClient tasks={tasks as any} projectId="proj" linkPrefix="/portal/proj" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows search bar when task count >= 8', () => {
    const many = makeTasks(Array.from({ length: 8 }, (_, i) => `Char${i}`))
    render(<RosterClient tasks={many as any} projectId="proj" linkPrefix="/portal/proj" />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('does not show search bar when task count < 8', () => {
    render(<RosterClient tasks={tasks as any} projectId="proj" linkPrefix="/portal/proj" />)
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
  })

  it('filters characters by name (case-insensitive)', () => {
    const many = makeTasks(Array.from({ length: 8 }, (_, i) => `Char${i}`))
    render(<RosterClient tasks={many as any} projectId="proj" linkPrefix="/portal/proj" />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'char3' } })
    expect(screen.getByText('Char3')).toBeInTheDocument()
    expect(screen.queryByText('Char0')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest --no-coverage --testPathPattern="comments-drawer|roster-client" 2>&1 | tail -10
```
Expected: FAIL (modules not found).

- [ ] **Step 3: Create CommentsDrawer**

```tsx
// src/components/portal/comments-drawer.tsx
'use client'

import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { Comments } from '@/components/preview/comments'

interface CommentsDrawerProps {
  projectId: string
}

export function CommentsDrawer({ projectId }: CommentsDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Comments"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#666',
        }}
      >
        <MessageSquare size={12} />
        Comments
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-96 overflow-y-auto"
        style={{
          background: 'rgba(10,10,10,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FF9500' }}>
            Project Comments
          </p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-1 rounded-lg transition-colors"
            style={{ color: '#555' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Comments */}
        <div className="flex-1 px-5 py-4">
          {open && <Comments projectId={projectId} />}
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Create RosterClient**

```tsx
// src/components/portal/roster-client.tsx
'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { PrvTask } from '@/lib/types/database'

// CharacterCardGrid is a server component — in portal/[pid]/page.tsx we pass
// pre-rendered card items as children instead of calling CharacterCardGrid here.
// RosterClient only owns: search state + filtered task list passed to children.

interface RosterClientProps {
  tasks: PrvTask[]
  children: (filteredTasks: PrvTask[]) => React.ReactNode
}

export function RosterClient({ tasks, children }: RosterClientProps) {
  const [query, setQuery] = useState('')
  const showSearch = tasks.length >= 8

  const filtered = useMemo(() => {
    if (!query.trim()) return tasks
    const q = query.toLowerCase()
    return tasks.filter(t => t.name.toLowerCase().includes(q))
  }, [tasks, query])

  return (
    <div className="space-y-5">
      {showSearch && (
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#444' }}
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search characters..."
            className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>
      )}
      {children(filtered)}
    </div>
  )
}
```

Note: `RosterClient` uses render-props pattern (`children` as function) so the server component `CharacterCardGrid` can be passed from the server page.

- [ ] **Step 5: Update roster-client tests to match render-props API**

```tsx
// __tests__/components/portal/roster-client.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { RosterClient } from '@/components/portal/roster-client'
import type { PrvTask } from '@/lib/types/database'

const makeTasks = (names: string[]): PrvTask[] =>
  names.map((name, i) => ({
    id: String(i), name, project_id: 'proj',
    sort_order: i, created_at: '',
    avatar_asset_id: null, avatar_animation: null, avatar_skin: null,
    avatar_scale: 1, avatar_offset_x: 0, avatar_offset_y: 0, avatar_bg: null,
  }))

const renderChild = (tasks: PrvTask[]) => (
  <div data-testid="grid">{tasks.map(t => <span key={t.name}>{t.name}</span>)}</div>
)

describe('RosterClient', () => {
  it('renders all characters when no search query', () => {
    const tasks = makeTasks(['Alice', 'Bob', 'Charlie'])
    render(<RosterClient tasks={tasks}>{renderChild}</RosterClient>)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows search bar when task count >= 8', () => {
    const many = makeTasks(Array.from({ length: 8 }, (_, i) => `Char${i}`))
    render(<RosterClient tasks={many}>{renderChild}</RosterClient>)
    expect(screen.getByPlaceholderText(/search characters/i)).toBeInTheDocument()
  })

  it('does not show search bar when task count < 8', () => {
    const tasks = makeTasks(['Alice', 'Bob'])
    render(<RosterClient tasks={tasks}>{renderChild}</RosterClient>)
    expect(screen.queryByPlaceholderText(/search characters/i)).not.toBeInTheDocument()
  })

  it('filters characters by name case-insensitively', () => {
    const many = makeTasks(Array.from({ length: 8 }, (_, i) => `Char${i}`))
    render(<RosterClient tasks={many}>{renderChild}</RosterClient>)
    fireEvent.change(screen.getByPlaceholderText(/search characters/i), { target: { value: 'char3' } })
    expect(screen.getByText('Char3')).toBeInTheDocument()
    expect(screen.queryByText('Char0')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Rewrite /portal/[pid]/page.tsx**

```tsx
// src/app/(portal)/portal/[pid]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CharacterCardGrid } from '@/components/dashboard/character-card-grid'
import { CommentsDrawer } from '@/components/portal/comments-drawer'
import { RosterClient } from '@/components/portal/roster-client'
import type { PrvProfile, PrvProject, PrvTask } from '@/lib/types/database'

export default async function PortalProjectPage({ params }: { params: { pid: string } }) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, role')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'role'> | null }

  const { data: project } = (await supabase
    .from('Prv_projects')
    .select('*')
    .eq('id', params.pid)
    .single()) as { data: PrvProject | null }

  const isInternal = profile?.role === 'internal'
  if (!project || (!isInternal && project.client_id !== profile?.client_id)) notFound()

  const { data: tasks } = (await supabase
    .from('Prv_tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order')
    .order('created_at')) as { data: PrvTask[] | null }

  const taskList = tasks ?? []

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:text-white"
            style={{ color: '#444' }}
          >
            ← All Projects
          </Link>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            {project.name}
          </h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#444' }}>
            {taskList.length} character{taskList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CommentsDrawer projectId={project.id} />
      </div>

      {/* Roster */}
      {taskList.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-24 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#444' }}>No assets uploaded yet</p>
          <p className="text-xs mt-1" style={{ color: '#333' }}>Check back soon — our team is working on it.</p>
        </div>
      ) : (
        <RosterClient tasks={taskList}>
          {(filtered) => (
            <CharacterCardGrid
              tasks={filtered}
              project={project}
              linkPrefix={`/portal/${params.pid}`}
              readonly
            />
          )}
        </RosterClient>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Run tests**

```bash
npx jest --no-coverage --testPathPattern="comments-drawer|roster-client" 2>&1 | tail -10
```
Expected: all pass.

- [ ] **Step 8: Build check**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 9: Commit**

```bash
git add src/components/portal/comments-drawer.tsx src/components/portal/roster-client.tsx \
  src/app/\(portal\)/portal/\[pid\]/page.tsx \
  __tests__/components/portal/comments-drawer.test.tsx \
  __tests__/components/portal/roster-client.test.tsx
git commit -m "feat(portal): roster page — search filter + comments side drawer"
```

---

## Task 6: SpineAvatarPreview — expose imperative setAnimation handle

**Files:**
- Modify: `src/components/dashboard/spine-avatar-preview.tsx`

Needed so ShowcaseHero can switch animations without remounting the Spine player.

- [ ] **Step 1: Add forwardRef + useImperativeHandle to SpineAvatarPreview**

Add at the top of the file (after existing imports):
```tsx
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface SpineAvatarPreviewHandle {
  setAnimation: (name: string) => void
}
```

Change the function signature from:
```tsx
export function SpineAvatarPreview({...}: SpineAvatarPreviewProps) {
```
To:
```tsx
export const SpineAvatarPreview = forwardRef<SpineAvatarPreviewHandle, SpineAvatarPreviewProps>(
  function SpineAvatarPreview({...}: SpineAvatarPreviewProps, ref) {
```
(and close with `})`  at the end of the function)

Add inside the function body (alongside existing refs):
```tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerInstanceRef = useRef<any>(null)

useImperativeHandle(ref, () => ({
  setAnimation: (name: string) => {
    try {
      playerInstanceRef.current?.animationState?.setAnimation(0, name, true)
    } catch {
      /* non-fatal */
    }
  },
}))
```

In the `success` callback inside the effect, store the player:
```tsx
success: (player: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  playerInstanceRef.current = player
  // ... existing onLoaded code ...
},
```

Full updated file:

```tsx
// src/components/dashboard/spine-avatar-preview.tsx
'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface SpineAvatarPreviewHandle {
  setAnimation: (name: string) => void
}

export interface SpineLoadedData {
  animations: string[]
  skins: string[]
}

interface SpineAvatarPreviewProps {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  skinName?: string
  scale?: number
  offsetX?: number
  offsetY?: number
  autoFit?: boolean
  backgroundColor?: string
  spineVersion: string
  onError?: () => void
  onLoaded?: (data: SpineLoadedData) => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getScriptUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

export const SpineAvatarPreview = forwardRef<SpineAvatarPreviewHandle, SpineAvatarPreviewProps>(
  function SpineAvatarPreview(
    {
      jsonUrl, atlasUrl, animationName, skinName,
      scale = 1, offsetX = 0, offsetY = 0,
      autoFit = false, backgroundColor = '#00000000',
      spineVersion, onError, onLoaded,
    }: SpineAvatarPreviewProps,
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const initializedRef = useRef(false)
    const onErrorRef = useRef(onError)
    const onLoadedRef = useRef(onLoaded)
    const scaleRef = useRef(scale)
    const offsetXRef = useRef(offsetX)
    const offsetYRef = useRef(offsetY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerInstanceRef = useRef<any>(null)

    onErrorRef.current = onError
    onLoadedRef.current = onLoaded
    scaleRef.current = scale
    offsetXRef.current = offsetX
    offsetYRef.current = offsetY

    useImperativeHandle(ref, () => ({
      setAnimation: (name: string) => {
        try {
          playerInstanceRef.current?.animationState?.setAnimation(0, name, true)
        } catch {
          /* non-fatal */
        }
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      let cancelled = false

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !initializedRef.current) {
            observer.disconnect()
            init()
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(container)

      async function init() {
        if (cancelled) return
        try {
          const scriptId = `spine-js-${spineVersion}`
          if (!document.getElementById(scriptId)) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script')
              script.id = scriptId
              script.src = getScriptUrl(spineVersion)
              script.onload = () => resolve()
              script.onerror = () => reject(new Error(`Failed to load Spine v${spineVersion}`))
              document.body.appendChild(script)
            })
          }

          if (cancelled || !containerRef.current) return

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const SpinePlayerClass = (window as any).spine?.SpinePlayer
          if (!SpinePlayerClass) {
            onErrorRef.current?.()
            return
          }

          initializedRef.current = true

          const viewport = autoFit
            ? { padLeft: '6%', padRight: '6%', padTop: '6%', padBottom: '6%' }
            : {
                x: -100 * scaleRef.current + offsetXRef.current,
                y: -100 * scaleRef.current + offsetYRef.current,
                width: 200 * scaleRef.current,
                height: 200 * scaleRef.current,
                padLeft: '0%', padRight: '0%', padTop: '0%', padBottom: '0%',
              }

          new SpinePlayerClass(containerRef.current, {
            jsonUrl,
            atlasUrl,
            animation: animationName || undefined,
            skin: skinName || undefined,
            showControls: false,
            backgroundColor,
            premultipliedAlpha: true,
            defaultMix: 0.2,
            viewport,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            success: (player: any) => {
              if (cancelled) return
              playerInstanceRef.current = player
              try {
                const data = player?.skeleton?.data
                if (data) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const animations: string[] = (data.animations ?? []).map((a: any) => a.name).filter(Boolean)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const skins: string[] = (data.skins ?? []).map((s: any) => s.name).filter(Boolean)
                  onLoadedRef.current?.({ animations, skins })
                }
              } catch {
                /* non-fatal */
              }
            },
            error: () => {
              if (!cancelled) onErrorRef.current?.()
            },
          })
        } catch {
          if (!cancelled) onErrorRef.current?.()
        }
      }

      return () => {
        cancelled = true
        observer.disconnect()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jsonUrl, atlasUrl, animationName, skinName, autoFit, backgroundColor, spineVersion])

    const transform =
      autoFit && (scale !== 1 || offsetX !== 0 || offsetY !== 0)
        ? `translate(${offsetX}%, ${offsetY}%) scale(${scale})`
        : undefined

    return (
      <div
        className="w-full h-full"
        style={{ background: 'transparent', transform, transformOrigin: 'center' }}
      >
        <div ref={containerRef} className="w-full h-full" />
      </div>
    )
  }
)

SpineAvatarPreview.displayName = 'SpineAvatarPreview'
```

- [ ] **Step 2: Build + tests**

```bash
npx next build 2>&1 | tail -5 && npx jest --no-coverage 2>&1 | tail -5
```
Expected: clean build, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/spine-avatar-preview.tsx
git commit -m "feat(portal): SpineAvatarPreview — forwardRef + imperative setAnimation"
```

---

## Task 7: ShowcaseHero + ArtFilmstrip + wire character detail page

**Files:**
- Create: `src/components/portal/showcase-hero.tsx`
- Create: `src/components/portal/art-filmstrip.tsx`
- Modify: `src/app/(portal)/portal/[pid]/characters/[cid]/page.tsx`
- Test: `__tests__/components/portal/showcase-hero.test.tsx`

- [ ] **Step 1: Write failing ShowcaseHero tests**

```tsx
// __tests__/components/portal/showcase-hero.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ShowcaseHero } from '@/components/portal/showcase-hero'

jest.mock('@/components/dashboard/spine-avatar-preview', () => ({
  SpineAvatarPreview: jest.fn((_props: unknown, ref: unknown) => {
    if (ref && typeof ref === 'object' && ref !== null) {
      (ref as { current: { setAnimation: jest.Mock } }).current = { setAnimation: jest.fn() }
    }
    return <div data-testid="spine-player" />
  }),
}))

const spineConfig = {
  jsonUrl: '/api/spine/t1/skeleton.json',
  atlasUrl: '/api/spine/t1/skeleton.atlas',
  animationName: 'idle',
  spineVersion: '4.1',
  spineAvatarBg: '#00000000',
}

describe('ShowcaseHero', () => {
  it('renders Spine player when spineConfig provided', () => {
    render(<ShowcaseHero characterName="Alice" spineConfig={spineConfig} />)
    expect(screen.getByTestId('spine-player')).toBeInTheDocument()
  })

  it('renders art image when no spineConfig but artUrl provided', () => {
    render(<ShowcaseHero characterName="Alice" artUrl="https://example.com/art.png" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders placeholder when neither spine nor art', () => {
    render(<ShowcaseHero characterName="Alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders animation chips when animations available', () => {
    render(
      <ShowcaseHero
        characterName="Alice"
        spineConfig={spineConfig}
        animations={['idle', 'run', 'attack']}
      />
    )
    expect(screen.getByRole('button', { name: 'idle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'run' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'attack' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npx jest --no-coverage --testPathPattern="showcase-hero" 2>&1 | tail -10
```

- [ ] **Step 3: Create ShowcaseHero**

```tsx
// src/components/portal/showcase-hero.tsx
'use client'

import { useRef, useState } from 'react'
import { SpineAvatarPreview, type SpineAvatarPreviewHandle } from '@/components/dashboard/spine-avatar-preview'

interface SpineHeroConfig {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  spineVersion: string
  spineAvatarBg: string
}

interface ShowcaseHeroProps {
  characterName: string
  spineConfig?: SpineHeroConfig
  artUrl?: string
  animations?: string[]      // populated from SpineAvatarPreview onLoaded callback
}

export function ShowcaseHero({
  characterName,
  spineConfig,
  artUrl,
  animations: initialAnimations = [],
}: ShowcaseHeroProps) {
  const spineRef = useRef<SpineAvatarPreviewHandle>(null)
  const [activeAnim, setActiveAnim] = useState(spineConfig?.animationName ?? '')
  const [animations, setAnimations] = useState<string[]>(initialAnimations)
  const [spineError, setSpineError] = useState(false)
  const [showExpandHint, setShowExpandHint] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const showSpine = Boolean(spineConfig) && !spineError
  const showArt = !showSpine && Boolean(artUrl)
  const showPlaceholder = !showSpine && !showArt

  function handleChipClick(name: string) {
    setActiveAnim(name)
    spineRef.current?.setAnimation(name)
  }

  return (
    <div
      className="-mx-4 sm:-mx-6"
      style={{ position: 'relative' }}
    >
      {/* Hero zone */}
      <div
        style={{
          height: 'clamp(280px, 55vh, 680px)',
          position: 'relative',
          overflow: 'hidden',
          background: showSpine && spineConfig?.spineAvatarBg && spineConfig.spineAvatarBg !== '#00000000'
            ? `#${spineConfig.spineAvatarBg.slice(1, 7)}`
            : '#0a0a0a',
        }}
      >
        {/* Spine player */}
        {showSpine && spineConfig && (
          <SpineAvatarPreview
            ref={spineRef}
            jsonUrl={spineConfig.jsonUrl}
            atlasUrl={spineConfig.atlasUrl}
            animationName={spineConfig.animationName}
            autoFit
            backgroundColor={spineConfig.spineAvatarBg}
            spineVersion={spineConfig.spineVersion}
            onError={() => setSpineError(true)}
            onLoaded={(data) => {
              if (data.animations.length > 0) setAnimations(data.animations)
            }}
          />
        )}

        {/* Art hero */}
        {showArt && (
          <button
            className="absolute inset-0 w-full h-full"
            onClick={() => setLightboxOpen(true)}
            aria-label="Expand image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artUrl}
              alt={characterName}
              className="w-full h-full object-contain"
            />
            {showExpandHint && (
              <div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  color: '#888',
                  backdropFilter: 'blur(8px)',
                  animation: 'fadeOut 3s forwards 2s',
                }}
              >
                Click to expand
              </div>
            )}
          </button>
        )}

        {/* Placeholder */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              style={{
                fontSize: '8rem', fontWeight: 900,
                color: 'rgba(255,149,0,0.06)',
                userSelect: 'none',
                textTransform: 'uppercase',
              }}
            >
              {characterName.charAt(0)}
            </span>
          </div>
        )}

        {/* Bottom gradient fade */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '80px',
            background: 'linear-gradient(to top, #080808 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Animation chips strip — overlays bottom of hero */}
        {showSpine && animations.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-3 pt-4"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
          >
            {animations.map(anim => (
              <button
                key={anim}
                onClick={() => handleChipClick(anim)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: activeAnim === anim
                    ? 'rgba(255,149,0,0.2)'
                    : 'rgba(0,0,0,0.5)',
                  border: activeAnim === anim
                    ? '1px solid rgba(255,149,0,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: activeAnim === anim ? '#FF9500' : '#666',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {anim}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox for art hero */}
      {lightboxOpen && artUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artUrl}
            alt={characterName}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            style={{ fontSize: '1.5rem' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ArtFilmstrip**

```tsx
// src/components/portal/art-filmstrip.tsx
'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ImageLightbox, type LightboxAsset } from '@/components/preview/image-lightbox'

interface ArtFilmstripProps {
  assets: LightboxAsset[]
}

export function ArtFilmstrip({ assets }: ArtFilmstripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  async function handleDownload(assetId: string) {
    const res = await fetch(`/api/assets/${assetId}/download`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {assets.map((asset, idx) => (
          <div
            key={asset.id}
            style={{ scrollSnapAlign: 'start', flexShrink: 0, position: 'relative' }}
            className="group"
          >
            <button
              onClick={() => setLightboxIndex(idx)}
              style={{
                display: 'block',
                width: '120px',
                height: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                background: '#0a0a0a',
                cursor: 'pointer',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,149,0,0.4)'
                el.style.boxShadow = '0 4px 20px rgba(255,149,0,0.12)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.boxShadow = 'none'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.presignedUrl}
                alt={asset.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
            {/* Download on hover */}
            <button
              onClick={() => handleDownload(asset.id)}
              aria-label="Download"
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            >
              <Download size={10} style={{ color: '#888' }} />
            </button>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          assets={assets}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDownload={handleDownload}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Rewrite /portal/[pid]/characters/[cid]/page.tsx**

```tsx
// src/app/(portal)/portal/[pid]/characters/[cid]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ShowcaseHero } from '@/components/portal/showcase-hero'
import { ArtFilmstrip } from '@/components/portal/art-filmstrip'
import { SectionHeader } from '@/components/portal/section-header'
import { SpineAnimationGallery } from '@/components/dashboard/spine-animation-gallery'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import { Comments } from '@/components/preview/comments'
import type { PrvAsset, PrvProfile, PrvProject, PrvTask } from '@/lib/types/database'

export default async function PortalCharacterPage({
  params,
}: {
  params: { pid: string; cid: string }
}) {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('Prv_profiles')
    .select('client_id, role')
    .eq('id', user.id)
    .single()) as { data: Pick<PrvProfile, 'client_id' | 'role'> | null }

  const [{ data: project }, { data: task }] = await Promise.all([
    supabase.from('Prv_projects').select('*').eq('id', params.pid).single() as Promise<{ data: PrvProject | null }>,
    supabase.from('Prv_tasks').select('*').eq('id', params.cid).eq('project_id', params.pid).single() as Promise<{ data: PrvTask | null }>,
  ])

  const isInternal = profile?.role === 'internal'
  if (!project || (!isInternal && project.client_id !== profile?.client_id)) notFound()
  if (!task) notFound()

  const { data: assets } = (await supabase
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

  // Presign art assets for filmstrip
  const artWithUrls = await Promise.all(
    artAssets.map(async a => ({
      id: a.id,
      name: a.name,
      presignedUrl: await getPresignedGetUrl(a.r2_key).catch(() => ''),
    }))
  )
  const filmstripAssets = artWithUrls.filter(a => a.presignedUrl)

  // Spine showcase config
  let spineHeroConfig: { jsonUrl: string; atlasUrl: string; animationName: string; spineVersion: string; spineAvatarBg: string } | undefined
  if (task.avatar_asset_id && project.spine_version) {
    const { data: spineAsset } = (await supabase
      .from('Prv_assets')
      .select('name')
      .eq('id', task.avatar_asset_id)
      .single()) as { data: Pick<PrvAsset, 'name'> | null }
    if (spineAsset) {
      const base = spineAsset.name.replace(/\.[^./]+$/, '')
      spineHeroConfig = {
        jsonUrl: `/api/spine/${task.id}/${encodeURIComponent(spineAsset.name)}`,
        atlasUrl: `/api/spine/${task.id}/${encodeURIComponent(`${base}.atlas`)}`,
        animationName: task.avatar_animation ?? '',
        spineVersion: project.spine_version,
        spineAvatarBg: (task as any).avatar_bg ?? '#00000000', // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }
  }

  // First art URL for hero fallback (when no Spine)
  const heroArtUrl = filmstripAssets[0]?.presignedUrl

  // Spine gallery: find json + atlas pair in animation assets
  const jsonAnim = animAssets.find(a => a.name.endsWith('.json'))
  const atlasAnim = jsonAnim
    ? animAssets.find(a => a.name.endsWith('.atlas') && a.name.startsWith(jsonAnim.name.replace('.json', '')))
    : undefined

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-6 flex-wrap"
        style={{ color: '#444' }}
      >
        <Link href="/portal" className="hover:text-white transition-colors">Projects</Link>
        <span>›</span>
        <Link href={`/portal/${params.pid}`} className="hover:text-white transition-colors">{project.name}</Link>
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

      {/* Zone A — Showcase Hero (full-bleed) */}
      <ShowcaseHero
        characterName={task.name}
        spineConfig={spineHeroConfig}
        artUrl={!spineHeroConfig ? heroArtUrl : undefined}
      />

      {/* Zones B–E: padded content below hero */}
      <div className="space-y-12 mt-10">

        {/* Zone B — Art Filmstrip */}
        {filmstripAssets.length > 0 && (
          <section>
            <SectionHeader label="Art" count={filmstripAssets.length} />
            <ArtFilmstrip assets={filmstripAssets} />
          </section>
        )}

        {/* Zone C — Animation Gallery */}
        {jsonAnim && atlasAnim && project.spine_version && (
          <section>
            <SectionHeader label="Animations" />
            <SpineAnimationGallery
              taskId={task.id}
              jsonName={jsonAnim.name}
              atlasName={atlasAnim.name}
              spineVersion={project.spine_version}
            />
          </section>
        )}

        {/* Zone D — VFX */}
        {vfxAssets.length > 0 && (
          <section>
            <SectionHeader label="VFX" count={vfxAssets.length} />
            <AssetGridClient
              assets={vfxAssets}
              serviceType="vfx"
              projectId={project.id}
              readonly
            />
          </section>
        )}

        {/* Zone E — Comments */}
        <section>
          <details open>
            <summary
              className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none mb-4"
              style={{ color: '#444', listStyle: 'none' }}
            >
              ▾ &nbsp;Project Comments
            </summary>
            <Comments projectId={project.id} />
          </details>
        </section>

      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npx jest --no-coverage --testPathPattern="showcase-hero" 2>&1 | tail -10
```
Expected: all pass.

- [ ] **Step 7: Full build check**

```bash
npx next build 2>&1 | tail -8
```
Expected: clean.

- [ ] **Step 8: Full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -5
```
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/portal/showcase-hero.tsx \
  src/components/portal/art-filmstrip.tsx \
  src/app/\(portal\)/portal/\[pid\]/characters/\[cid\]/page.tsx \
  __tests__/components/portal/showcase-hero.test.tsx
git commit -m "feat(portal): character detail — full-bleed showcase, art filmstrip, scroll zones"
```

---

## Task 8: SpineAnimationGallery — visual upgrade

**Files:**
- Modify: `src/components/dashboard/spine-animation-gallery.tsx`

Gallery already works. Visual upgrade: bigger cells, pill buttons replacing dropdowns, darker cell backgrounds.

- [ ] **Step 1: Update SpineAnimationGallery visual style**

Replace the return JSX (keeping all logic above):

```tsx
  return (
    <div className="space-y-4">
      {/* Controls: pill buttons instead of dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Background pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {BACKGROUNDS.map(b => (
            <button
              key={b.value}
              onClick={() => setBg(b.value)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                background: bg === b.value ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: bg === b.value ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: bg === b.value ? '#FF9500' : '#555',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Skin pills */}
        {realSkins.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSkin('')}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                background: skin === '' ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: skin === '' ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: skin === '' ? '#FF9500' : '#555',
              }}
            >
              Default
            </button>
            {realSkins.map(s => (
              <button
                key={s}
                onClick={() => setSkin(s)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: skin === s ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                  border: skin === s ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  color: skin === s ? '#FF9500' : '#555',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* One looping view per animation — larger cells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {animations.map(anim => (
          <div
            key={`${anim}-${skin}-${bg}`}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="aspect-[3/4] relative"
              style={{ background: cellBg }}
            >
              <SpineAvatarPreview
                jsonUrl={jsonUrl}
                atlasUrl={atlasUrl}
                animationName={anim}
                skinName={skin}
                autoFit
                backgroundColor={bg}
                spineVersion={spineVersion}
              />
            </div>
            <div
              className="px-3 py-2.5 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-wider truncate"
                style={{ color: '#888' }}
                title={anim}
              >
                {anim}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
```

- [ ] **Step 2: Build + full tests**

```bash
npx next build 2>&1 | tail -5 && npx jest --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/spine-animation-gallery.tsx
git commit -m "feat(portal): animation gallery — pill controls + portrait cells"
```

---

## Task 9: Final QA + push

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -8
```
Expected: all tests pass (≥46).

- [ ] **Step 2: Full build**

```bash
npx next build 2>&1 | grep -E "error|warning|✓" | tail -15
```
Expected: no errors.

- [ ] **Step 3: Update TASKS.md + LOG.md**

In `.agent/meta/TASKS.md`, add under Done:
```
- [x] P6: Portal Redesign — Character-First Showcase — COMPLETE
```

In `.agent/meta/LOG.md`, prepend entry for today.

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `/portal` cover art cards — Task 3
- ✅ Darker bg + grain — Task 1
- ✅ `SectionHeader` — Task 2
- ✅ Character card glow/hover/portrait — Task 4
- ✅ Roster search ≥8 + comments drawer — Task 5
- ✅ `SpineAvatarPreview` imperative ref — Task 6
- ✅ ShowcaseHero (Spine / Art / placeholder) — Task 7
- ✅ Art filmstrip horizontal scroll — Task 7
- ✅ Scroll zones A–E on character page — Task 7
- ✅ Animation gallery visual upgrade — Task 8
- ✅ VFX + Comments zones wired — Task 7

**Key gotchas for implementer:**
1. `RosterClient` uses render-props (`children` as function) — the server component `CharacterCardGrid` is passed from the server page, not imported into the client component.
2. `SpineAvatarPreview` is now a `forwardRef` component — all existing usages still work (ref is optional).
3. Zone A hero breaks out of layout padding with `-mx-4 sm:-mx-6`. Content below resumes normal padding.
4. `CharacterCardItem` now passes `avatar_bg` to `SpineAvatarPreview` — the `task` type includes this field after Task 6 migration.
