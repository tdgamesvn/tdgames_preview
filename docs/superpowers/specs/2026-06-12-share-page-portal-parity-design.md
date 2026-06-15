# Share Page — Portal Parity Design

**Date:** 2026-06-12  
**Status:** Approved

## Problem

The public share page (`/share/[token]`) currently renders a flat asset list using `AssetGridClient` (raw file cards → modal viewer). This is fundamentally different from the authenticated client portal, which shows a polished character roster grid → full character showcase.

When a client shares a project link with a stakeholder, the experience should be indistinguishable from logging in as a client — the same visual quality, the same navigation flow, the same level of polish.

## Goals

- `/share/[token]` renders exactly the same UI as `/portal/[pid]` (character roster)
- `/share/[token]/characters/[cid]` renders exactly the same UI as `/portal/[pid]/characters/[cid]` (character detail)
- No login required; data fetched via admin client validated by `share_token` + `share_enabled = true`
- Respect project settings: `allow_download`, `allow_comments` (hidden for anonymous)
- Comments section hidden — anonymous users have no identity to post

## Non-Goals

- Anonymous users posting comments (no auth identity)
- Any new DB schema changes
- Changing the portal or dashboard routes

## Route Structure

```
/share/[token]                    → Project roster page
/share/[token]/characters/[cid]   → Character detail page
```

## Architecture

### Layout: `src/app/share/layout.tsx`

Mirrors the portal layout (`(portal)/layout.tsx`) with:
- Same grain texture overlay (`opacity: 0.035`, `background: #080808`)
- Same header style (`TDGAME` wordmark + `Preview` badge)
- Replace user/logout section with `Public Preview` badge (blue tint `#2196F3`)
- No auth check — layout is fully public

### Share Project Page: `src/app/share/[token]/page.tsx`

**Data fetching** (admin client):
1. Look up project by `share_token` + `share_enabled = true` → 404 if not found
2. Fetch all tasks for the project
3. For each task: fetch first art asset + avatar spine asset (same as portal `/[pid]/page.tsx`)
4. Build `CharacterCardData[]` array

**Rendering**: reuse `PortalCharacterGrid` component with:
- `linkPrefix="/share/[token]/characters"` (route to share character pages, not portal)
- `cardBgType`, `cardBgValue` from project settings

### Share Character Page: `src/app/share/[token]/characters/[cid]/page.tsx`

**Data fetching** (admin client):
1. Validate project by `share_token` + `share_enabled = true` → 404 if not found
2. Validate task belongs to project → 404 if not
3. Fetch all assets for the task (art, animation, vfx)
4. Build spine hero config (same logic as portal character page)

**Rendering**: reuse same components as portal character page:
- Breadcrumb: `Share Preview › [project.name] › [task.name]` (no links back to portal)
- `ShowcaseHero` — Spine / Art hero
- `ArtFilmstrip` — respect `allow_download`
- `SpineAnimationGallery` — if animation assets present
- `VfxInlineGrid` — respect `allow_download`
- Comments: **omitted entirely** (anonymous context)

## Spine API — Anonymous Access Problem

The existing `/api/spine/[taskId]/[name]` route requires an authenticated Supabase session (returns 401 for anonymous). Anonymous share visitors have no session, so Spine assets would fail silently.

### Solution: new share-spine proxy route

**New route:** `src/app/api/share-spine/[token]/[taskId]/[name]/route.ts`

- Same R2 streaming logic as `/api/spine/`
- Auth: validates `share_token` + `share_enabled = true` from `Prv_projects` (using admin client) instead of checking user session
- Caching: same ETag strategy

**`SpineAnimationGallery` change:** add optional `spineApiBase?: string` prop (default `'/api/spine'`). Internally constructs URLs as `` `${spineApiBase}/${taskId}/...` ``.

**Share pages** pass:
- `spineApiBase={'/api/share-spine/${token}'}` to `SpineAnimationGallery`
- Build `spineConfig.jsonUrl` / `.atlasUrl` as `/api/share-spine/${token}/${taskId}/...` when constructing `CharacterCardData`

## Component Reuse

All visual components are reused as-is with no modifications:

| Component | Reused in share? | Notes |
|-----------|-----------------|-------|
| `PortalCharacterGrid` | ✅ Yes (roster page) | |
| `ShowcaseHero` | ✅ Yes (character page) | |
| `ArtFilmstrip` | ✅ Yes | |
| `SpineAnimationGallery` | ✅ Yes (+ minor prop change) | Add `spineApiBase` prop |
| `VfxInlineGrid` | ✅ Yes | |
| `Comments` | ❌ No (anonymous) | |
| `CommentsDrawer` | ❌ No | |

## Data Access Pattern

Both share pages use `createAdminClient()` (service role, bypasses RLS). This is safe because:
- Token is validated server-side before any data is returned
- Share pages are Server Components — service role key never reaches the client
- Admin client is already used in the existing share page

## Error States

| Condition | Response |
|-----------|----------|
| Token not found | `notFound()` → Next.js 404 |
| `share_enabled = false` | `notFound()` → 404 |
| Task not in project | `notFound()` → 404 |

## Tests

- `__tests__/app/share/page.test.tsx` — existing tests updated to reflect new rendering (character grid instead of asset list)
- `__tests__/app/share/characters/page.test.tsx` — new: character detail page (validates data fetch + component render)
