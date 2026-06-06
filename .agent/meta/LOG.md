# Activity Log — tdgames_preview

## 2026-06-06 (UI/UX + Mobile)
- P6: UI/UX Redesign + Full Mobile Responsive
  - Font: Plus Jakarta Sans thay Montserrat (distinctive, premium)
  - globals.css: warm radial bg glow, custom scrollbar, card/button/tab/dialog CSS overrides
  - Sidebar: gradient logo icon, left-border active state, orange glow
  - dashboard/page.tsx: hero header, KPI cards, recent uploads redesign
  - client-form, project-settings-form, asset-upload: remove shadcn defaults, full dark styling
  - DashboardShell (new): Client Component quản lý mobile sidebar overlay + hamburger menu
  - Sidebar: onClose prop, X button, onClick trên nav items để auto-close
  - layout.tsx: dùng DashboardShell thay vì render Sidebar trực tiếp
  - Tất cả trang: p-4 sm:p-6 md:p-8 responsive padding
  - dashboard/page.tsx: grid-cols-1 sm:grid-cols-3 cho KPI
  - Portal + Share: responsive header + main padding
  - Fix bug: onMouseEnter/Leave trong Server Component → CSS .kpi-card/.list-row
  - 38/38 tests pass, build clean, deployed

## 2026-06-06
- Áp dụng STYLE_GUIDE toàn bộ app (P5: Style Guide Refactor)
  - tailwind.config.ts: color tokens (#FF9500, bg/surface/neutral-*/status-*) + Montserrat
  - globals.css: dark-only CSS vars (--popover, --muted, --card, v.v.), bỏ light-mode
  - layout.tsx: load Montserrat qua next/font/google, class font-montserrat trên body
  - sidebar.tsx: đã compliant, commit kèm
  - Dashboard layout: bg-bg thay gradient #0a0804
  - dashboard/page.tsx: xoá <style> block + Rajdhani/Audiowide; KPI cards + list rows đúng style guide
  - clients/page.tsx: dark list panel, XS buttons, empty state
  - clients/[id]/page.tsx: project cards tối, status badge, empty state
  - clients/[id]/projects/[pid]/page.tsx: breadcrumb + heading tối
  - portal layout: dark header với primary badge
  - portal/page.tsx: project grid tối
  - portal/[pid]/page.tsx: heading + status badge + tabs tối
  - share/[token]/page.tsx: dark header + layout
  - login/page.tsx: xoá Rajdhani/JetBrains Mono → Montserrat; amber #f59e0b → #FF9500
  - login-form.tsx: xoá monoFont prop
  - 38/38 tests pass, build clean, pushed GitHub

## 2026-06-05
- Khởi tạo dự án, viết design spec đầy đủ (roles, DB schema, UI structure, asset preview)
- Brainstorm kiến trúc: Next.js 14 App Router + Supabase SSR + Cloudflare R2 + Docker
- Viết P1 implementation plan (Task 1-7)
- Bootstrap Next.js 14 scaffold: Tailwind + shadcn/ui + Supabase SSR + Jest
- Đẩy initial commit lên GitHub (branch: `feat/p1-foundation-auth`)
- Setup `.agent/meta/` memory files + `CLAUDE.md` cho project
- Triển khai hoàn tất P1: Foundation + Auth
  - Task 2: Supabase SSR clients (client/server/middleware-client) + DB types
  - Task 3: Migration SQL — 5 bảng Prv_* + RLS policies + trigger auto-create profile
  - Task 4: LoginForm component (`'use client'`, shadcn/ui) + login page
  - Task 5: getRedirectPath (pure fn, 9 unit tests) + Next.js middleware route protection
  - Task 6: Stub pages — /(dashboard)/dashboard, /(portal)/portal, /share/[token]
  - Task 7: 11/11 tests pass, `npm run build` clean, sẵn sàng apply migration lên Supabase
- Ghi chú: Migration SQL cần apply thủ công qua Supabase Dashboard hoặc CLI

## 2026-06-05 (P5)
- Triển khai hoàn tất P5: Deploy lên vps6core
  - Quyết định dùng PM2 thay Docker (disk VPS 76% đầy, PM2 đã có sẵn, Node 22 tương thích)
  - Tạo `ecosystem.config.js` — PM2 config, port 3001
  - Tạo `scripts/deploy-vps.sh` — one-command redeploy từ local
  - VPS: clone repo → tạo .env.production → npm ci → npm run build → pm2 start
  - nginx config `preview.tdgamestudio.com` → proxy 127.0.0.1:3001, reload thành công
  - DNS qua Cloudflare proxy (orange cloud) — Cloudflare xử lý HTTPS
  - App live tại http://preview.tdgamestudio.com (HTTP 200 ✅)
  - PM2 startup configured (tự restart khi VPS reboot)
  - Còn cần: apply Supabase migration + tạo tài khoản internal đầu tiên

## 2026-06-05 (P4)
- Triển khai hoàn tất P4: Client Portal + Share
  - Task 1: Portal layout — header display_name + logout button
  - Task 2: Portal projects list — grid dự án active của client (filter theo client_id)
  - Task 3: AssetGridClient `readonly` prop — ẩn nút Delete cho portal và share
  - Task 4: AssetViewerModal — download dùng presignedUrl trực tiếp khi có sẵn (không cần API auth)
  - Task 5: Portal project detail `/portal/[pid]` — tabs Art/Animation/VFX/Comments, read-only, ownership check
  - Task 6: Public share page `/share/[token]` — admin client bypass RLS, presigned URLs server-side, 404 nếu share_enabled=false
  - 38/38 tests pass, build clean, pushed to GitHub

## 2026-06-05 (P3)
- Triển khai hoàn tất P3: Asset Preview System
  - Task 1: Download API route — presigned GET URL từ R2 (3 tests)
  - Task 2: Comments API route — GET list + POST create với admin client (4 tests)
  - Task 3: ImageLightbox — fullscreen Art preview, keyboard nav (←/→/Esc), thumbnail strip
  - Task 4: VfxViewer — GIF `<img>`, MP4/WebM `<video>`, Unity package icon + download
  - Task 5: SpinePlayer — dynamic CDN load by version, animation/skin controls
  - Task 6: AssetViewerModal — unified modal, route sang lightbox/spine/vfx theo service_type
  - Task 7: Comments component — initial load + Supabase Realtime INSERT subscription
  - Task 8: AssetGridClient (click card → mở modal) + Comments tab trong project detail
  - Fix ESLint errors (no-explicit-any, no-unused-vars) để build pass
  - 38/38 tests pass, build clean

## 2026-06-05 (P2 + P3 planning)
- Triển khai hoàn tất P2: Internal Dashboard
  - Sửa Jest setup: undici → Node 26 native fetch, @jest-environment node cho API tests
  - Sửa @base-ui/react moduleNameMapper + cài class-variance-authority
  - Task 1-6: R2 client, admin client, client/project CRUD actions, presign + asset API routes
  - Task 7-10: Sidebar nav, dashboard layout, clients pages, project detail tabs, asset grid + upload, overview page
  - Fix Supabase v2.107 type inference (as any casts), shadcn Dialog API (controlled state), Select onValueChange
  - 31/31 tests pass, build clean, pushed to GitHub
- Viết P3 implementation plan: `docs/superpowers/plans/2026-06-05-p3-asset-preview.md`
  - Task 1: Download API (presigned GET URL)
  - Task 2: Comments API (GET + POST, admin client)
  - Task 3: ImageLightbox (Art preview, keyboard nav, thumbnail strip)
  - Task 4: VfxViewer (GIF/video/Unity package)
  - Task 5: SpinePlayer (dynamic CDN load by version, animation/skin controls)
  - Task 6: AssetViewerModal (unified — routes to correct viewer by service_type)
  - Task 7: Comments component (Supabase Realtime subscription)
  - Task 8: Wire dashboard — AssetGridClient (clickable cards) + Comments tab
