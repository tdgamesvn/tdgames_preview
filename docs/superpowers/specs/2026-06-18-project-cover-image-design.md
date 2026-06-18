# Project Cover Image — Design Spec

**Date:** 2026-06-18  
**Status:** Approved  
**Feature:** Allow internal team to upload a dedicated cover image for each project, displayed on the client portal's project card.

---

## Problem

The portal's project card cover is currently auto-selected as the first `art` asset uploaded to a project (ordered by `created_at` ASC). There is no way for the internal team to intentionally set a specific cover image — whichever Art file happens to be uploaded first becomes the cover. This is unpredictable and produces inconsistent results.

## Goal

Internal team can upload a dedicated cover image per project from the dashboard Settings tab. The cover is stored independently from the asset library and displayed on the portal project card. If no cover is set, the existing fallback (first Art asset → gradient placeholder) remains unchanged.

---

## Approach

**Approach A — `cover_r2_key` column + dedicated API route** (selected)

- Add `cover_r2_key TEXT NULL` to `Prv_projects`.
- Dedicated API route handles upload to R2 and updates the project record atomically.
- Cover file lives at `covers/{projectId}/{timestamp}-{filename}` in R2 — separate from the `uploads/` prefix used by assets.
- Portal reads `cover_r2_key` first; falls back to first Art asset if NULL.
- `PortalProjectCard` component requires no changes.

---

## Database

### Migration

```sql
ALTER TABLE "Prv_projects"
  ADD COLUMN cover_r2_key TEXT NULL;
```

`NULL` means no cover has been set. No default value. No FK — the cover file is project metadata managed directly, not a `Prv_assets` record.

### TypeScript (`src/lib/types/database.ts`)

Add to `PrvProject` interface:

```ts
/** R2 key of the portal cover image. NULL = fallback to first Art asset. */
cover_r2_key: string | null
```

---

## API

### `POST /api/projects/[id]/cover`

Upload a new cover image and set it on the project.

- **Auth:** Server-side `getUser()` → must be `internal` role (checked via `Prv_profiles`).
- **Body:** `multipart/form-data`, field `file` (image/*).
- **R2 key:** `covers/{projectId}/{Date.now()}-{sanitisedFilename}`
- **Steps:**
  1. Upload file bytes to R2 via `putObject`.
  2. Update `Prv_projects.cover_r2_key = r2Key` using the admin Supabase client.
- **Success response:** `{ r2_key: string }` (200)
- **Error responses:** 400 (no file), 401 (not authenticated), 403 (not internal), 500 (R2 or DB failure)

### `DELETE /api/projects/[id]/cover`

Remove the cover image (sets `cover_r2_key` back to NULL).

- **Auth:** Same as POST.
- **Steps:** Update `Prv_projects.cover_r2_key = NULL`.
- **Note:** The R2 object is intentionally NOT deleted to avoid complexity. Orphaned cover files are small and infrequent.
- **Success response:** `{ ok: true }` (200)

---

## Dashboard UI

### Location

New **"Portal Cover"** section added to `ProjectSettingsForm` (`src/components/dashboard/project-settings-form.tsx`), inserted **above** the existing "Card Background" section.

### Behaviour

- On mount, reads `project.cover_r2_key` from the prop.
- **Upload:** File input (`accept="image/*"`) → POST to `/api/projects/[id]/cover` → on success, update local state with returned `r2_key` and show preview. Auto-saves immediately; no need to press "Save Settings".
- **Remove:** Button visible only when cover is set → DELETE to `/api/projects/[id]/cover` → clear local state. Also auto-applies immediately.
- **Preview:** 16:9 div (matching portal card ratio) showing the current cover or a gradient placeholder if none set.
- **Loading state:** "Uploading…" label, button disabled during request.
- **Error state:** Inline error message below the upload button on failure.

### Visual layout (within the form's existing style)

```
Portal Cover
┌─────────────────────────────────────┐  ← 16:9 preview
│  [cover image or gradient fallback] │
└─────────────────────────────────────┘
  [📷 Upload Cover]   [Remove]   ← Remove only shown when cover_r2_key is set
  "Shown on the project card in the client portal"
```

The preview URL is `${NEXT_PUBLIC_R2_PUBLIC_URL}/${cover_r2_key}`.

---

## Portal Page

**File:** `src/app/(portal)/portal/page.tsx`

Change cover resolution logic:

```ts
// Priority: explicit cover > first Art asset > undefined (gradient)
let coverUrl: string | undefined
if (project.cover_r2_key) {
  coverUrl = getPublicUrl(project.cover_r2_key)
} else if (firstArt?.[0]?.r2_key) {
  coverUrl = getPublicUrl(firstArt[0].r2_key)
}
```

`PortalProjectCard` receives `coverUrl` exactly as before — no changes needed to that component.

---

## File Checklist

| File | Change |
|------|--------|
| `supabase/migrations/20260618_add_project_cover.sql` | New migration |
| `src/lib/types/database.ts` | Add `cover_r2_key` to `PrvProject` |
| `src/app/api/projects/[id]/cover/route.ts` | New API route (POST + DELETE) |
| `src/components/dashboard/project-settings-form.tsx` | Add "Portal Cover" section |
| `src/app/(portal)/portal/page.tsx` | Update cover resolution logic |
| `__tests__/api/projects/cover.test.ts` | Unit tests for new API route |

---

## Testing

**API tests (`__tests__/api/projects/cover.test.ts`):**
- POST: 200 with valid file + internal user → r2_key returned, project updated
- POST: 403 with client role user
- POST: 400 with no file
- DELETE: 200 with internal user → cover_r2_key set to NULL
- DELETE: 403 with client role user

**Manual verification:**
1. Upload cover → verify preview appears in Settings tab.
2. Check portal → project card shows uploaded cover.
3. Remove cover → portal card falls back to first Art asset (or gradient if no Art assets).
4. Existing projects with no cover set → portal unchanged (fallback still works).

---

## Out of Scope

- Deleting the R2 object on cover removal (acceptable orphan, negligible size).
- Picking from existing Art assets (Upload-only as requested).
- Cover image on the portal project *detail* page (currently no cover shown there).
- Share page cover image (separate concern, not requested).
