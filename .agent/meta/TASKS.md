# Tasks — tdgames_preview

## Doing
(none — all phases complete ✅)

## Done (recent)
- [x] P6: Portal Redesign — Character-First Showcase — COMPLETE (commit a885037)
  - [x] Portal layout: dark #080808 + grain texture overlay
  - [x] /portal: cinematic 16:9 project cards with cover art + hover glow
  - [x] /portal/[pid]: roster grid + CommentsDrawer (no Tabs)
  - [x] /portal/[pid]/characters/[cid]: scroll zones A–E (no Tabs)
  - [x] CharacterCardItem: 2:3 portrait, orange glow hover, "View →" reveal
  - [x] SpineAvatarPreview: forwardRef + imperative setAnimation()
  - [x] SpineAnimationGallery: pill buttons + portrait 3:4 cells
  - [x] 46/46 tests pass, build clean, pushed to main

## Done
- [x] P8: Character Card Grid + Spine Avatar Preview — COMPLETE
  - [x] DB migration: avatar columns on Prv_tasks
  - [x] SpineAvatarPreview component (lazy, no controls)
  - [x] CharacterCardItem + CharacterCardGrid server component
  - [x] AvatarConfigPanel (dashboard only, live preview)
  - [x] Portal /portal/[pid]/characters/[cid] route
  - [x] Dashboard /dashboard/.../[pid]/characters/[cid] route
  - [x] Updated portal + dashboard [pid] pages (card grid + presigned URL bug fix)
  - [x] 41/41 tests pass, build clean, committed
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
- [x] P5: Deploy — COMPLETE
  - [x] PM2 ecosystem.config.js (port 3001)
  - [x] scripts/deploy-vps.sh (redeploy helper)
  - [x] VPS: clone → .env.production → npm build → pm2 start
  - [x] nginx proxy preview.tdgamestudio.com → 127.0.0.1:3001
  - [x] PM2 startup on reboot
  - [x] Supabase migration apply — confirmed applied (20260605140940)
  - [x] Tạo tài khoản internal — tdgames.vn@gmail.com, role=internal, display_name="TDGame Studio"
- [x] P4: Client Portal + Share — COMPLETE
  - [x] Task 1: Portal layout — header với display_name + logout
  - [x] Task 2: Portal projects list — grid dự án của client
  - [x] Task 3: AssetGridClient readonly prop — ẩn delete cho portal/share
  - [x] Task 4: AssetViewerModal — dùng presignedUrl trực tiếp cho download
  - [x] Task 5: Portal project detail — tabs Art/Animation/VFX/Comments (read-only)
  - [x] Task 6: Public share page — admin client + presigned URLs server-side, 404 nếu disabled
  - [x] Task 7: 38/38 tests pass, build clean, pushed to GitHub
- [x] P3: Asset Preview System — COMPLETE
  - [x] Task 1: Download API — GET presigned URL từ R2 (3 tests)
  - [x] Task 2: Comments API — GET list + POST create (4 tests)
  - [x] Task 3: ImageLightbox — fullscreen Art preview, keyboard nav, thumbnail strip
  - [x] Task 4: VfxViewer — GIF/MP4/WebM/Unity package preview
  - [x] Task 5: SpinePlayer — dynamic CDN load by version, animation/skin controls
  - [x] Task 6: AssetViewerModal — unified modal, routes by service_type
  - [x] Task 7: Comments component — Supabase Realtime subscription
  - [x] Task 8: Wire dashboard — AssetGridClient (clickable) + Comments tab, 38/38 tests, build clean
- [x] P2: Internal Dashboard — COMPLETE
  - [x] Task 1: Install deps (R2 SDK, shadcn components, lucide-react, @base-ui/react)
  - [x] Task 2: Admin Supabase client + R2 client (presign/get/delete)
  - [x] Task 3: Server actions — Client CRUD (5 tests)
  - [x] Task 4: Server actions — Project CRUD (4 tests)
  - [x] Task 5: POST /api/upload/presign — R2 presigned URL (4 tests)
  - [x] Task 6: POST /api/assets + DELETE /api/assets/[id] (5 tests)
  - [x] Task 7: Dashboard layout + Sidebar nav + logout route
  - [x] Task 8: Clients list + detail pages, ClientForm + ProjectForm dialogs
  - [x] Task 9: Project detail — Art/Animation/VFX/Settings tabs, AssetGrid, AssetUpload
  - [x] Task 10: Dashboard overview — stats + recent uploads, 31/31 tests, build clean
