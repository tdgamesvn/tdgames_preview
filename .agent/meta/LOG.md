# Activity Log — tdgames_preview

## 2026-06-07 (Spine preview — fix tận gốc + skin/animation runtime)
- **Bug gốc:** Spine chưa từng render với asset upload vì (a) URL atlas hardcode `skeleton.atlas` không tồn tại, (b) texture .png không resolve được do atlas presigned + key có prefix timestamp, (c) metadata rỗng → không có danh sách animation/skin.
- **Fix:** thêm proxy route `/api/spine/[taskId]/[name]` stream file Spine từ R2 trên path sạch ổn định → json↔atlas↔png tự liên kết. Đọc animations + skins TỪ skeleton lúc runtime (spine-player `success` callback / built-in controls). Thêm dropdown Skin + cột `avatar_skin` (migration). `getR2Object` trong r2.ts.
- **Lan ra:** card avatar (`character-card-grid`/`item`) + modal tab Animation (`asset-viewer-modal` + `spine-player`) đều chuyển sang proxy URL; spine-player `animations/skins` thành optional (dùng controls có sẵn); file .png/.atlas trong tab Animation → nút download thay vì player hỏng.
- **Verified live (build C4Xhu2uob…):** Avatar Config render Spine + dropdown Animation/Skin (screenshot user); project detail card render `<canvas>` Spine (spineLoaded=true, hết PNG fallback). Proxy json/atlas/png = 200. 46/46 test pass, typecheck sạch.
- Commits: `58cb055` (core), `221581a` (card + modal). Deploy OK.
- LƯU Ý: chunk cũ bị cache trong browser → cần **hard-refresh** lần đầu mới thấy build mới.

## 2026-06-06 (FIXED & VERIFIED — atomic deploy + client self-heal + CF purge)
- Reproduce crash qua Playwright (login internal tdgames.vn@gmail.com) → click card Superman → `ChunkLoadError: Loading chunk 969 failed` (404) + React #423 → ErrorBoundary "Something went wrong". Bắt được đúng stack trace.
- **Root cause chính xác:** khe hở trong `deploy-remote.sh` cũ — `mv .next .next-old && mv .next-build .next` để `.next` vắng mặt vài ms → chunk request lúc đó = 404 → browser cache cứng (immutable, max-age 1 năm) → vỡ client-nav tới khi hard-refresh.
- **FIX 1 (server, root cause):** rewrite `scripts/deploy-remote.sh` → release-dir + **symlink swap** (`ln -sfn … .next.tmp && mv -Tf .next.tmp .next`, rename(2) atomic, `.next` không bao giờ vắng). Migration 1 lần từ `.next` dir thật → `releases/legacy-*`, carry-forward chunk, prune giữ 3. Đã test symlink-swap trên VPS + `bash -n`.
- **FIX 2 (client, lưới an toàn):** `ErrorView` detect ChunkLoadError → `hardReload()` (`src/lib/reload.ts`, guard sessionStorage 10s). 4 test mới, jest **46/46 pass**, typecheck sạch (chỉ base-ui pre-existing).
- Commit `6883035` → push main → GitHub Actions run 27067309362 **success** (1m31s). Verify VPS: `.next` là symlink → `releases/rel-20260606-231323-*`, legacy migrate OK, buildId mới `04Olkpmj48rBq8m8if1xa`, site 200.
- **Verify thực tế:** fresh browser (cache sạch) → click card → **hết crash, hết ChunkLoadError**, trang character render OK.
- **CF purge:** user purge Cloudflare thủ công → chunk 969 giờ trả 200 (HIT). Bản 404 cache cứng đã sạch.
- Phụ: lỡ xóa nhầm nhân vật Superman khi test (click trúng nút xóa, accessible-name lừa) → **đã khôi phục** task + 8 assets vào DB. Hạ tầng memory ghi SAI: KHÔNG phải Docker — thực tế **PM2 (`npm start`=next start) ở `/opt/tdgames-preview`, port 3001**, nginx proxy, Cloudflare trước.

## 2026-06-06 (Auto-deploy GitHub Actions — secrets + first run live)
- Hoàn tất wiring CI/CD: GitHub Actions `deploy.yml` (push→main, appleboy/ssh-action) + atomic build/swap `scripts/deploy-remote.sh` (NEXT_DIST_DIR=.next-build, swap, carry-forward chunks → diệt 404-window của character page).
- Điều tra & set 4 repo secrets qua `gh` CLI (PAT scope `repo`, GH_TOKEN bypass keyring hỏng): VPS_HOST=180.93.144.98, VPS_USER=root, VPS_PORT=22, VPS_SSH_KEY=~/.ssh/tdgames_preview_deploy (deploy key đã có trong authorized_keys VPS).
- Sự cố giả "port 22 closed": thực ra IP nhà (14.177.78.65) bị **fail2ban ban** trên VPS (REJECT trong f2b-sshd); INPUT policy ACCEPT, ufw tắt, không có provider firewall → GitHub Actions SSH:22 OK. Tailscale SSH bypass fail2ban nên local vẫn vào được.
- Trigger workflow_dispatch → run 27065729438 **success** (1m26s). Verify: VPS HEAD=0b9f2d4 trên main, pm2 online (restart mới), site HTTP 200, JS chunk HTTP 200, .next-old/.next-build đã dọn.
- Còn lại (manual): Playwright mở trang character có login để khẳng định 0 console error (thiếu cred trong phiên này).

## 2026-06-06 (ROOT CAUSE thật của "character page crash" — 404 immutable chunk)
- Post-deploy verify: unban IP nhà khỏi fail2ban (ssh:22 trực tiếp đã thông). Tạm bật share ORCA (token 6476ae12…) để Playwright verify không cần login → đã tắt lại sau.
- **Phát hiện qua Playwright + browser_evaluate:** trang share báo `ChunkLoadError: Loading chunk 969 failed` (404 `/_next/static/chunks/969-…js`) + React #423.
  - `fetch(no-store)` chunk → **200** (cf HIT); `fetch()` default-cache → **404**; script-tag URL gốc → error; script-tag thêm `?probe=` → OK 200.
  - ⇒ Origin/CF HIỆN serve 200; nhưng browser/edge đã **cache cứng 1 bản 404** cho chunk immutable (`max-age=31536000, immutable`) → vỡ tới khi hard-refresh.
- **Nguồn 404:** khe hở trong `deploy-remote.sh`: giữa `mv .next .next-old` và `mv .next-build .next`, thư mục `.next` biến mất → mọi request chunk lúc đó = 404. Carry-forward chỉ cứu chunk *cũ*, KHÔNG bịt được khe `.next` vắng mặt. Đây là root cause thật của "character page crash" mà các session trước chưa bắt được.
- **Trạng thái:** site OK với user mới / đã hard-refresh (CF serve 200); chỉ browser dính 404 trong khe deploy là vỡ.
- **FIX đề xuất (CHƯA triển khai — chờ duyệt):**
  1. Atomic symlink swap: build vào `releases/<BUILD_ID>/`, carry-forward chunk, `.next` là symlink, swap bằng `ln -sfn … .next.tmp && mv -T .next.tmp .next` (rename nguyên tử) → không còn 404-window.
  2. Purge Cloudflare cache 1 lần (cần CF API token) để xoá 404 đã lỡ cache ở edge.
  3. nginx: `proxy_intercept_errors` + không cache 4xx cho `/_next/static/*` (phòng hờ).

## 2026-06-06 (Portal UI/UX polish + Spine fix)
- CharacterCardItem: fixed 200px → w-full + aspect-ratio 3/4 (responsive)
- CharacterCardGrid: flex-wrap → CSS grid 2→3→4→5 cols
- Portal /portal: new ProjectCard with banner, personalised greeting, hover arrow
- Portal /portal/[pid]: "← All Projects" back link, friendlier description
- Portal /portal/[pid]/characters/[cid]: breadcrumb, large heading, asset count badges,
  smart default tab, TabCount, EmptyTab "Check back soon" messaging
- AssetGridClient: separate readonly empty state vs internal empty state
- Removed General section from portal /portal/[pid] — clients see only character cards
- Fix Spine atlas URL bug: presigned URL .replace() invalidated S3 signature →
  new ?variant=atlas param on download API generates separate presigned URL for .atlas key
- AssetViewerModal: fetch atlasUrl in separate useEffect, show loading until resolved
- 42/42 tests pass (+1 atlas variant test), build clean, deployed ✅

## 2026-06-06 (P8: Character Card Grid + Spine Avatar Preview)
- DB migration `20260606100000_task_avatar.sql`: 5 avatar columns on Prv_tasks
- SpineAvatarPreview: client component, IntersectionObserver lazy-init, no controls, onError fallback
- CharacterCardItem: 200×260px card, Spine→art→placeholder fallback, orange glow hover, click → navigate
- CharacterCardGrid: server component, parallel presigned URL resolution (json + atlas + art thumbnail)
- AvatarConfigPanel: dashboard-only, asset/animation dropdowns, scale+offset sliders, live preview canvas
- New route /portal/[pid]/characters/[cid] — read-only tabs Art/Animation/VFX
- New route /dashboard/.../[pid]/characters/[cid] — full CRUD + AvatarConfigPanel
- Portal /portal/[pid]: replaced accordion with CharacterCardGrid, fix presigned URLs for General art
- Dashboard /[pid]: replaced inline CharacterCard with CharacterCardGrid + delete buttons row
- 41/41 tests pass (3 new for updateTaskAvatar), build clean (16 routes), committed f437e63

## 2026-06-06 (UX: Batch Characters + Dark Cards + Internal Preview)
- Batch character add: TaskManager dùng textarea comma/newline separated → createTasksBatch single INSERT
- AssetGridClient: restyle dark theme, orange hover border, "Preview" eye icon hint on hover
- AssetGridClient: delete dùng fetch+router.refresh (thay form method=DELETE không hoạt động)
- Portal /portal/[pid]: internal role bypass client_id ownership check
- Dashboard project page: "Preview as Client" button → mở portal tab mới
- 38/38 tests pass, build clean, deployed ✅

## 2026-06-06 (CORS Fix + Deploy)
- Fix: R2 CORS "Failed to fetch" khi upload trực tiếp từ browser
  - Chuyển sang proxy upload qua server (Option B)
  - Tạo `/api/upload/route.ts`: nhận FormData, upload R2 server-side, insert Supabase
  - Rewrite `AssetUpload` component: dùng `FormData` POST → `/api/upload` (không cần presign)
  - Commit: `fix: switch to server-side proxy upload — fix R2 CORS "Failed to fetch"`
  - Deploy thành công lên vps6core: build clean 14 routes, PM2 restart ✅

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

## 2026-06-06 (Bugfix — character page + comments)
- Điều tra crash "client-side exception" khi click card nhân vật (systematic-debugging + Supabase API logs)
- Bug A: asset-grid.tsx dùng `.is('task_id', <uuid>)` — `.is()` chỉ hợp lệ với null/boolean → PostgREST 400 → trang dashboard character KHÔNG load được asset (xác nhận 3×400 trong logs). Fix: `.eq()` cho uuid, `.is(null)` cho ungrouped.
- Bug B: API /projects/[id]/comments dùng embed `Prv_profiles(display_name)` nhưng thiếu FK → 400 → route trả {error} → Comments component gọi `data.filter` trên object → CRASH. Fix: bỏ embed, tra display_name riêng qua admin client + guard Array.isArray trong component.
- 42/42 tests pass, typecheck sạch (lỗi shadcn/ui base-ui là pre-existing).
- CHƯA bắt được đúng stack trace của crash khi click card (logs server không chứa lỗi JS trình duyệt; không có .env.local để chạy cục bộ). Cần retest sau deploy / hoặc console log.
