# tdgames_preview — Claude Code Instructions

## Project Overview
Private preview portal for TDGame Studio clients. Internal team uploads Art/Animation/VFX assets; clients log in to review, comment, download. See `.agent/meta/PROJECT.md` for full context.

## Active Branch
`feat/p1-foundation-auth` — currently implementing P1: Foundation + Auth

## Tech Stack
- **Next.js 14** (App Router, TypeScript) — `src/app/`
- **Tailwind CSS** + **shadcn/ui** — all UI components from shadcn, never write raw CSS unless necessary
- **Supabase** (`@supabase/ssr`) — auth, DB, RLS
- **Cloudflare R2** — file storage (presigned URLs, never expose credentials to client)
- **Jest** + **React Testing Library** — unit tests in `__tests__/`

## Code Conventions

### File Structure
```
src/
  app/          — Next.js pages/layouts (App Router)
  components/   — Reusable UI components
    ui/         — shadcn/ui generated components (don't modify directly)
    auth/       — Auth-related components
  lib/
    supabase/   — Supabase client helpers (client.ts / server.ts / middleware-client.ts)
    types/      — TypeScript types (database.ts)
supabase/
  migrations/   — SQL migration files (apply via Supabase CLI or Dashboard)
__tests__/      — Jest tests (mirror src/ structure)
```

### Supabase Clients — Use the Right One
| Context | Import from |
|---------|-------------|
| Client Component (`'use client'`) | `@/lib/supabase/client` |
| Server Component / Server Action / Route Handler | `@/lib/supabase/server` |
| `middleware.ts` | `@/lib/supabase/middleware-client` |

**NEVER** call `supabase.auth.getSession()` — always use `supabase.auth.getUser()` (secure, server-validated).

### DB Tables
All tables prefixed `Prv_` (quoted in SQL: `"Prv_profiles"`).
Types defined in `src/lib/types/database.ts`.

### RLS — Never bypass
Never use `SUPABASE_SERVICE_ROLE_KEY` in client-side code.
Service role key is only for server-side admin operations (Route Handlers, migration scripts).

### shadcn/ui
Add components via: `npx shadcn@latest add <component>`
Never edit files under `src/components/ui/` directly.

### Environment Variables
- `NEXT_PUBLIC_*` — safe to use in client components
- `SUPABASE_SERVICE_ROLE_KEY`, `R2_*` — server-side only, never in `'use client'` files
- `.env.local` — never commit (in .gitignore); use `.env.example` as template

## Testing
- Tests in `__tests__/` mirroring `src/` structure
- Run: `npx jest --no-coverage`
- Always write failing test first (TDD), then implement
- Mock Supabase client in tests: `jest.mock('@/lib/supabase/client', () => (...))`

## Git Workflow
- Branch: `feat/p1-foundation-auth` (current)
- Commit after each task (see plan for exact commit messages)
- Push to: `https://github.com/tdgamesvn/tdgames_preview`

## Memory Files (update after meaningful work)
- `.agent/meta/TASKS.md` — task status
- `.agent/meta/LOG.md` — dated activity log
- `.agent/meta/DECISIONS.md` — only durable architectural decisions

## Implementation Plans
- P1 (active): `docs/superpowers/plans/2026-06-05-p1-foundation-auth.md`
- Spec: `docs/superpowers/specs/2026-06-05-preview-app-design.md`

## Current Status
P1 (Foundation + Auth) ✅ COMPLETE
P5 (Deploy) ✅ COMPLETE — live tại `preview.tdgamestudio.com`
P2 (Internal Dashboard), P3 (Asset Preview), P4 (Client Portal) — check `.agent/meta/TASKS.md` for latest

---

## ⚡ Session Memory
> **Đây là persistent memory qua các session. Claude PHẢI đọc phần này khi bắt đầu. Cập nhật cuối mỗi session.**

### Trạng thái hiện tại
<!-- Claude: cập nhật sau mỗi session với format bên dưới -->
- **Phase đang làm:** P6 ✅ COMPLETE — tất cả phases P1–P6 đã xong
- **Branch hiện tại:** `main`
- **Vừa hoàn thành:** P6 Portal Cinematic Redesign — dark layout, cinematic project cards, scroll zones A–E cho character page, SpineAvatarPreview forwardRef, pill buttons gallery. 46/46 tests pass. Commit `a885037`, pushed → auto-deploy.
- **Tiếp theo cần làm:** Monitor production, bugfix nếu phát sinh.

### Context quan trọng
<!-- Ghi lại những gì cần nhớ giữa các session: config đặc biệt, bug đã gặp, quyết định đột xuất -->
- App đã deploy: `preview.tdgamestudio.com` — **PM2** (`npm start`=next start) ở `/opt/tdgames-preview:3001` trên VPS vps6core, nginx proxy + Cloudflare. **KHÔNG phải Docker.** Auto-deploy: GitHub Actions push→main → `scripts/deploy-remote.sh` (release-dir + symlink swap atomic).
- ChunkLoadError sau deploy = chunk 404 bị cache immutable; fix gốc là deploy atomic, nếu lỡ dính thì hard-refresh / purge Cloudflare.
- DB: Supabase project `zjunfcyymesfpeikspzf`
- Storage: Cloudflare R2 bucket `tdgames-preview-assets`

### Hướng dẫn cập nhật Session Memory
Khi user bảo "lưu context" hoặc kết thúc session dài, chạy:
```
# Cập nhật phần "Trạng thái hiện tại" trong CLAUDE.md với progress thực tế
# Thêm vào "Context quan trọng" bất kỳ điều gì cần nhớ qua session mới
```
