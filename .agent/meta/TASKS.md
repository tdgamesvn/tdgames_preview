# Tasks — tdgames_preview

## Doing
- [ ] P2: Internal Dashboard — client/project management, asset upload
- [ ] P3: Asset Preview System — image lightbox, Spine player, VFX viewer
- [ ] P4: Client Portal + Share — client view, comments, public share
- [ ] P5: Deploy — Docker + nginx on vps6core

## Done
- [x] Design spec — `docs/superpowers/specs/2026-06-05-preview-app-design.md`
- [x] P1 implementation plan — `docs/superpowers/plans/2026-06-05-p1-foundation-auth.md`
- [x] Next.js 14 scaffold (create-next-app + Supabase deps + shadcn/ui + Jest)
- [x] Initial commit + push to GitHub (`feat/p1-foundation-auth`)
- [x] Setup `.agent/meta/` memory structure
- [x] P1: Foundation + Auth — COMPLETE
  - [x] Task 1: Bootstrap Next.js 14 project
  - [x] Task 2: Supabase Client Setup (client/server/middleware-client + DB types)
  - [x] Task 3: Database Migration SQL (Prv_* tables + RLS policies)
  - [x] Task 4: Login Page + LoginForm component (2 tests)
  - [x] Task 5: Middleware — Route Protection + getRedirectPath (9 tests)
  - [x] Task 6: Stub Pages + Layouts (dashboard, portal, share)
  - [x] Task 7: Full Test Run (11/11 pass) + Build clean
