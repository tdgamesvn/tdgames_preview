# Portal Redesign — Approach B: Character-First Showcase
**Date:** 2026-06-07  
**Status:** Approved for implementation  
**Scope:** Client portal only (`/portal/*`) — no dashboard changes, no DB changes

---

## Goals

Make the client portal feel like a **game studio showcase**, not a file browser. Clients (game industry) expect cinematic, atmospheric, impressive. The viewing experience is the primary goal; downloading is secondary and optional.

## Non-Goals

- Dashboard (`/dashboard/*`) — untouched
- Backend/API/DB — no new migrations or routes
- Auth flow — untouched
- Public share page (`/share/*`) — out of scope for this phase

---

## Visual Language (global)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#080808` | Page background (slightly darker than current) |
| Surface | `rgba(255,255,255,0.03)` | Card backgrounds |
| Accent | `#FF9500` | Glow, borders on hover, labels |
| Grain | SVG noise pseudo-element, opacity ~3% | Cinematic texture on hero zones |
| Card hover | `box-shadow: 0 8px 40px rgba(255,149,0,0.18)` + `translateY(-3px)` | All clickable cards |
| Typography | Uppercase, tracking-widest — unchanged | Labels, headings |

Grain texture applied via `::before` pseudo-element with inline SVG `feTurbulence` filter — CSS only, no external asset.

---

## Page 1: `/portal` — Project List

### Current problem
Cards show a single letter initial on a flat gradient. No visual identity per project.

### New design

**Card anatomy (aspect ratio 16:9):**
```
┌─────────────────────────────────────┐
│  [Cover image — first character's   │  ← object-cover, blurred backdrop
│   avatar art OR Spine screenshot]   │    scale(1.05), overlay gradient:
│                                     │    transparent → #080808 (bottom 50%)
│  ░░░░ grain texture ░░░░            │
│                                     │
│  PROJECT NAME (uppercase)           │  ← bottom-left, white
│  X characters  ·  active       →   │  ← muted text + arrow, bottom-right
└─────────────────────────────────────┘
```

**Cover image source (priority order):**
1. First character's art asset presigned URL (fetched server-side)
2. Dark gradient with project name large & faded (if no characters, or characters have no art)

Note: Spine cannot render server-side (requires browser canvas). No Spine screenshot fallback.

**Hover state:**
- Card: `scale(1.02)`, glow border `rgba(255,149,0,0.4)`, `translateY(-3px)`
- Cover image: `scale(1.08)` (subtle zoom, CSS only via `transition: transform 500ms`)

**Grid:** `1 col / sm:2 col / lg:3 col` — unchanged from current

**Implementation notes:**
- Server component fetches first character + first art asset per project
- Presigned URL server-side (same pattern as CharacterCardGrid)
- `<Image>` with `fill` + `object-cover` inside positioned container

---

## Page 2: `/portal/[pid]` — Character Roster

### Current problem
Tabs component splits Characters and Comments. Comments tab is wasteful — clients go there only occasionally. Grid is 3-col max, cards smaller than they could be.

### New design

**Header (compact, ~60px):**
```
← All Projects    PROJECT NAME · active    [💬]
                  32 characters
```
- `[💬]` button fixed top-right, opens **Comments side drawer** (slides in from right, `w-96`, backdrop blur, `z-50`)
- Comments component already exists — wrap in drawer shell

**Search bar:** Client-side filter input, appears when character count ≥ 8. Debounce 200ms. Filters by `task.name` case-insensitive. Clears on blur if empty.

**Character grid:**
- Aspect ratio: `2:3` (portrait — taller cards, more character presence)
- Columns: `2 / sm:3 / md:4 / lg:5` (more columns than before)
- Spine plays immediately on each card (lazy via IntersectionObserver — existing behavior)
- Card footer: character name, slides up on hover revealing "View →" chip

**Empty state:** Kept simple — single centered message, no emoji clutter.

**Comments side drawer:**
- `<aside>` with `position: fixed`, `inset-y-0 right-0`, `w-full sm:w-96`
- Dark glass: `background: rgba(10,10,10,0.95)`, `backdrop-filter: blur(20px)`
- `border-left: 1px solid rgba(255,255,255,0.08)`
- Close button top-right of drawer
- Contains existing `<Comments projectId={...} />` component

---

## Page 3: `/portal/[pid]/characters/[cid]` — Character Detail

### Current problem
Tabs (Art / Animation / VFX) fragment the experience. Client has to click to discover what's available. Animation is the most exciting but lives behind a tab click.

### New design: Single-scroll showcase

Everything is a vertical scroll. Sections are skipped automatically if no assets exist.

---

### Zone A — Showcase Hero (always present)

Full-bleed, no horizontal padding, `height: 60vh` desktop / `45vh` mobile.

**Spine primary (when avatar configured):**
```
┌────────────────────────────────────────────────────┐
│                                                    │
│         [SpineAvatarPreview — full bleed]          │
│              autoFit, backgroundColor from         │
│              task.avatar_bg                        │
│                                                    │
│  [idle] [run] [attack] [die]    ⬇ Download (icon) │  ← overlay bottom strip
└────────────────────────────────────────────────────┘
```
- Animation chips: row of pill buttons, clicking switches the active animation. Chips built from `onLoaded` callback (existing pattern from AvatarConfigPanel). Active chip highlighted orange.
- Download icon: `⬇` icon button, small (16px), top-right corner of the strip. Opens a small popover with downloadable files list — not prominent.
- `SpineAvatarPreview` reused with `autoFit={true}`. **Important:** switching animation must NOT remount the component (that reloads the skeleton). Implementation must expose a `playerRef` and call `player.animationState.setAnimation(0, name, true)` imperatively on chip click. The `animationName` prop is only the initial value; subsequent changes go through the ref.

**Art primary (no Spine, has art):**
- First art image fills the hero zone (`object-contain`, dark bg)
- Click → opens existing `ImageLightbox` fullscreen
- "Click to expand" hint overlay, fades out after 3s

**Neither (no Spine, no art):**
- Dark hero zone with character name large, centered, faded orange tint
- Height reduces to `200px`

---

### Zone B — Art Strip (skip if no art assets)

```
ART  ·  12 images                              [View all →]
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│      │ │      │ │      │ │      │ │      │  → horizontal scroll
│ img  │ │ img  │ │ img  │ │ img  │ │ img  │
│      │ │      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
  120×160px thumbnails, click → ImageLightbox at that index
```
- `overflow-x: auto`, `scroll-snap-type: x mandatory`
- Each thumbnail: `snap-start`, rounded, hover glow
- "View all →" opens lightbox at index 0
- Presigned URLs already computed server-side

---

### Zone C — Animation Gallery (skip if no animation assets)

```
ANIMATIONS  ·  8 animations
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Spine│ │ Spine│ │ Spine│ │ Spine│  → existing SpineAnimationGallery grid
│ idle │ │ run  │ │atk   │ │die   │
│      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘
```
- Existing `SpineAnimationGallery` component — **no changes needed**
- Label row above: `ANIMATIONS · N` in section-header style

---

### Zone D — VFX (skip if no VFX assets)

```
VFX  ·  3 files
[existing VfxViewer grid]
```
- Existing `AssetGridClient` with `serviceType="vfx"` — **no changes needed**
- Label row above: `VFX · N` in section-header style

---

### Zone E — Comments (always present, collapsible)

```
▾  PROJECT COMMENTS
[existing Comments component]
```
- `<details>` element, `open` by default
- Existing `<Comments projectId={...} />` — **no changes needed**

---

### Download UX

Downloads are **not prominent** — they exist but don't compete with the viewing experience:
- Zone A: single `⬇` icon in the Showcase strip (per-animation or skeleton file)
- Zone B: each thumbnail has a `⬇` icon on hover only
- Zone C/D: existing download buttons in each asset card — unchanged

No "Download All" button. Downloads are per-asset, not bulk.

---

### Breadcrumb

Slim single line, top of page:
```
Projects  ›  Project Name  ›  Character Name
```
Font: `text-[10px] uppercase tracking-widest`, color `#444` → `#888` on hover.

---

## Components Reused (no changes)

| Component | Where used |
|-----------|-----------|
| `SpineAvatarPreview` | Zone A (Spine hero), character cards |
| `SpineAnimationGallery` | Zone C |
| `ImageLightbox` | Zone A (Art primary click), Zone B thumbnails |
| `VfxViewer` / `AssetGridClient` | Zone D |
| `Comments` | Zone E, Comments side drawer |

## New Components Needed

| Component | Purpose |
|-----------|---------|
| `PortalProjectCard` | New project card with cover image + hover |
| `CharacterRosterPage` | Roster with search + comments drawer |
| `CommentsDrawer` | Side drawer shell wrapping existing Comments |
| `CharacterShowcasePage` | New character detail — scroll zones A–E |
| `ShowcaseHero` | Zone A logic (Spine/Art/placeholder) |
| `ArtFilmstrip` | Zone B horizontal scroll strip |
| `SectionHeader` | Reusable label row (`ART · 12 images`) |

---

## Responsive Behavior

| Breakpoint | Project grid | Roster grid | Showcase height |
|-----------|-------------|-------------|----------------|
| mobile (<640px) | 1 col | 2 col | 45vh |
| tablet (640–1024px) | 2 col | 3 col | 50vh |
| desktop (>1024px) | 3 col | 4–5 col | 60vh |

Comments drawer: full-width on mobile (bottom sheet style), `w-96` on sm+.

---

## Error Handling

- Cover image fails to load → fallback to gradient (using `onError` on `<img>`)
- Spine fails to load → Zone A falls back to Art, then placeholder (existing `onError` prop)
- No sections have data → show empty state "No assets uploaded yet — check back soon."

---

## Out of Scope

- Animations/transitions between pages (Next.js App Router doesn't support page transitions without extra libs)
- Infinite scroll / pagination for large character grids (client-side filter is sufficient for now)
- Video autoplay in Zone A (VFX is in Zone D only)
- Dark/light mode toggle
