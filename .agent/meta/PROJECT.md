# tdgames_preview — Project Context

## What is this?
Private preview portal for TDGame Studio clients to review Art, Animation, and VFX deliverables.
Internal team uploads/manages assets; clients log in to view, comment, and download.
Projects can optionally be shared via a public link (no login required).

## Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Auth + DB:** Supabase (email/password, PostgreSQL, RLS, Realtime)
- **Storage:** Cloudflare R2 (presigned URLs)
- **Deploy:** PM2 (`npm start` = `next start`) on VPS vps6core at `/opt/tdgames-preview` (port 3001), behind nginx + Cloudflare. NOT Docker. Auto-deploy via GitHub Actions on push→main → `scripts/deploy-remote.sh` (release-dir + atomic symlink swap of `.next`).

## Roles
| Role | Access |
|------|--------|
| `internal` | Full dashboard: manage clients, projects, upload assets |
| `client` | Read-only portal: view own projects, comment, download |
| `anonymous` | Public share page via token URL (no login) |

## Route Map
```
/login                        → Auth page
/(dashboard)/*                → Internal team only
/(portal)/*                   → Client role only
/share/[token]                → Public (no auth required)
/                             → Redirects to /dashboard or /portal by role
```

## DB Tables (prefix Prv_)
- `Prv_profiles` — extends auth.users, stores role + client_id
- `Prv_clients` — client companies
- `Prv_projects` — projects per client, with share_token
- `Prv_assets` — uploaded files (art/animation/vfx), stored in R2
- `Prv_comments` — project-level or asset-level comments

## Phases
| Phase | Status | Description |
|-------|--------|-------------|
| P1: Foundation + Auth | 🚧 In Progress | Supabase auth, DB schema, route protection |
| P2: Internal Dashboard | ⏳ Not started | Client/project management, asset upload |
| P3: Asset Preview System | ⏳ Not started | Image lightbox, Spine player, VFX viewer |
| P4: Client Portal + Share | ⏳ Not started | Client view, comments, public share links |
| P5: Deploy | ⏳ Not started | Docker + nginx on vps6core |

## Key Files
- `docs/superpowers/specs/2026-06-05-preview-app-design.md` — Full design spec
- `docs/superpowers/plans/2026-06-05-p1-foundation-auth.md` — P1 implementation plan
- `middleware.ts` — Route protection (to be created in P1)
- `src/lib/supabase/` — Supabase SSR clients
- `supabase/migrations/` — DB schema SQL

## Env Vars Needed
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME / R2_PUBLIC_URL
```
