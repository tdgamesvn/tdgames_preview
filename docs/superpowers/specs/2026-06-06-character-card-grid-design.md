# Character Card Grid + Spine Avatar Preview — Design Spec

**Date:** 2026-06-06  
**Branch:** feat/p6-character-card-grid (new branch off main)  
**Status:** Approved, ready for implementation

---

## Overview

This phase introduces two changes:

1. **Bug fix:** Portal pages (`/portal/[pid]`, `/share/[token]`) do not generate presigned URLs for art thumbnails before passing assets to `AssetGridClient`, so all thumbnails fall back to emoji icons. Fix by replicating the presigned-URL generation pattern already used in `asset-grid.tsx`.

2. **Feature:** Replace the current accordion-style character list (task name → art/anim/vfx assets) with a **character card grid**. Each card shows a live Spine animation (configurable by internal team) or falls back to the first art image. Clicking a card navigates to a new character detail route with tabs Art / Animation / VFX.

Both portal and dashboard are updated.

---

## DB Schema Changes

New migration: `supabase/migrations/20260606100000_task_avatar.sql`

```sql
ALTER TABLE "Prv_tasks"
  ADD COLUMN avatar_asset_id  uuid  REFERENCES "Prv_assets"(id) ON DELETE SET NULL,
  ADD COLUMN avatar_animation text,
  ADD COLUMN avatar_scale     float NOT NULL DEFAULT 1.0,
  ADD COLUMN avatar_offset_x  float NOT NULL DEFAULT 0,
  ADD COLUMN avatar_offset_y  float NOT NULL DEFAULT 0;
```

| Column | Purpose |
|--------|---------|
| `avatar_asset_id` | Which Spine animation asset to use as card preview (FK → `Prv_assets`). `NULL` = not configured |
| `avatar_animation` | Animation name to play (e.g. `"idle"`). Must exist in the asset's `metadata.animations` |
| `avatar_scale` | Scale multiplier for the Spine canvas within the card (default 1.0) |
| `avatar_offset_x` | Horizontal offset in pixels (default 0) |
| `avatar_offset_y` | Vertical offset in pixels (default 0) |

**Fallback chain for card preview:**
1. Spine avatar — if `avatar_asset_id` is set and the asset's `.json` + `.atlas` files resolve
2. First art image — presigned URL of the first `service_type = 'art'` asset for this task
3. Placeholder — character initial letter in a styled circle

**TypeScript** — update `PrvTask` in `src/lib/types/database.ts`:

```typescript
export interface PrvTask {
  id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
  avatar_asset_id: string | null
  avatar_animation: string | null
  avatar_scale: number
  avatar_offset_x: number
  avatar_offset_y: number
}
```

Also add `Prv_tasks` to the `Database` tables map with the new fields.

---

## New Routes

### Portal character detail
```
/portal/[pid]/characters/[cid]
```
- Server component
- Auth: user must be logged in; `client` role restricted to own projects
- Shows character name + back link to `/portal/[pid]`
- Tabs: **Art** | **Animation** | **VFX** — read-only (`AssetGridClient` with `readonly` prop)
- Generates presigned URLs for art assets server-side
- 404 if character does not belong to the project

### Dashboard character detail
```
/dashboard/clients/[id]/projects/[pid]/characters/[cid]
```
- Server component
- Auth: internal role only
- Shows character name + breadcrumb
- Tabs: **Art** | **Animation** | **VFX** — full CRUD (uses `AssetGrid` server component)
- Also shows **`AvatarConfigPanel`** at the top for configuring Spine avatar
- 404 if character does not belong to the project

---

## New Components

### `CharacterCardGrid` — Server Component
`src/components/dashboard/character-card-grid.tsx`

Responsibilities:
- Receives `tasks`, `project` (with `spine_version`), `linkPrefix` (portal or dashboard path), `readonly` flag
- For each task: fetch the first art asset → generate presigned URL (server-side)
- For each task with `avatar_asset_id`: fetch the Spine asset → generate presigned URLs for `.json` and `.atlas` files
- Render `CharacterCardItem` with all pre-resolved data

Input props:
```typescript
interface CharacterCardGridProps {
  tasks: PrvTask[]
  project: PrvProject
  linkPrefix: string   // e.g. "/portal/pid123" or "/dashboard/clients/cid/projects/pid123"
  readonly: boolean
}
```

### `CharacterCardItem` — Client Component
`src/components/dashboard/character-card-item.tsx`

- Renders one card in the grid
- Card size: fixed 200×260px (or responsive via CSS grid)
- Shows `SpineAvatarPreview` if Spine URLs are available; else shows art `<img>`; else shows placeholder circle
- Character name at bottom
- Click → `router.push(href)` to character detail route
- Hover effect: subtle orange border glow

### `SpineAvatarPreview` — Client Component
`src/components/dashboard/spine-avatar-preview.tsx`

- Loads Spine Web Player from CDN (same CDN URL pattern as existing `SpinePlayer`)
- Runs in "avatar mode": no controls, no UI chrome, just the animation looping
- Uses IntersectionObserver to defer Spine init until card is visible (performance)
- Accepts: `jsonUrl`, `atlasUrl`, `animationName`, `scale`, `offsetX`, `offsetY`, `spineVersion`
- On error: calls `onError()` prop → parent falls back to art image

### `AvatarConfigPanel` — Client Component
`src/components/dashboard/avatar-config-panel.tsx`

- Dashboard only, shown at top of character detail page
- Fields:
  - **Animation asset** — dropdown listing all `service_type = 'animation'` assets for this task
  - **Animation name** — dropdown populated from selected asset's `metadata.animations[]`
  - **Scale** — number input (0.1 – 5.0, step 0.1)
  - **Offset X / Y** — number inputs
- Save button → calls server action `updateTaskAvatar`
- Live preview canvas below the controls (same `SpineAvatarPreview` component, reacts to form state)

### Server Action `updateTaskAvatar`
`src/lib/actions/tasks.ts` (add alongside existing `createTasksBatch`, `deleteTask`)

```typescript
export async function updateTaskAvatar(params: {
  task_id: string
  project_id: string
  client_id: string
  avatar_asset_id: string | null
  avatar_animation: string | null
  avatar_scale: number
  avatar_offset_x: number
  avatar_offset_y: number
}): Promise<{ error?: string }>
```

---

## Updated Pages

### `portal/[pid]/page.tsx`
- Characters tab: replace accordion with `<CharacterCardGrid>` + below it a "General" section (ungrouped assets, accordion as before)
- Generate presigned URLs for art assets (bug fix) — pass to `AssetGridClient` in General section
- `CharacterCardGrid` handles its own presigned URLs internally

### `dashboard/.../[pid]/page.tsx`
- Characters tab: replace per-task accordion blocks with `<CharacterCardGrid>` + TaskManager + General section
- `CharacterCard` inner component (currently inline) is removed — superseded by `CharacterCardGrid`

### `share/[token]/page.tsx`
- No changes needed — share page already generates presigned URLs server-side via admin client

---

## Data Flow

```
Server page (portal/[pid] or dashboard/.../[pid])
  │
  ├─ fetch tasks (with avatar_asset_id, avatar_animation, scale, offsets)
  ├─ for each task with avatar_asset_id → fetch spine asset → presign .json + .atlas
  ├─ for each task → fetch first art asset → presign URL
  │
  └─ CharacterCardGrid (server, passes pre-resolved URLs down)
       └─ CharacterCardItem (client, click → navigate)
            └─ SpineAvatarPreview (client, lazy-loads Spine runtime)
                 or <img> art fallback
                 or placeholder circle
```

```
Dashboard character detail (/characters/[cid])
  │
  ├─ AvatarConfigPanel (client)
  │    └─ updateTaskAvatar (server action) → updates Prv_tasks row
  │
  └─ Tabs: Art / Animation / VFX
       └─ AssetGrid (server, full CRUD)
```

---

## Performance Considerations

- **Spine instances per page:** Only initialize when card enters viewport (IntersectionObserver). Spine runtime is loaded once from CDN and cached by browser.
- **Presigned URL generation:** Done in parallel (`Promise.all`) on the server. URLs expire in 1 hour (existing default).
- **Card grid layout:** CSS grid, responsive — 2 cols on mobile, 3 on sm, 4 on lg, 5 on xl.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Spine asset URLs fail to resolve | `SpineAvatarPreview` calls `onError()`, card shows art fallback |
| No art assets for task | Card shows placeholder circle with character initial |
| `avatar_animation` not found in asset metadata | Spine player uses first available animation |
| Character ID not in project | Server returns 404 |
| Client accessing wrong project | Server returns 404 |

---

## Testing

- Unit tests for `updateTaskAvatar` server action (success, unauthorized, missing task)
- Unit tests for `CharacterCardGrid` rendering (with Spine config, with art fallback, with placeholder)
- Existing 38 tests must continue to pass

---

## Out of Scope

- Share page (`/share/[token]`) character card redesign — share page keeps current layout, only presigned URL bug is fixed
- Reordering characters via drag-and-drop
- Avatar config for "General" (ungrouped assets have no task, so no avatar config)
