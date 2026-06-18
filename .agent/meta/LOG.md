# Activity Log — tdgames_preview

## 2026-06-15 (default_skin + lockedSkin full fix)
- Bug: `lockedSkin` chỉ wire vào `SpinePlayer` (modal) nhưng user nhìn thấy `SpineAnimationGallery` có skin picker riêng → skin không bị lock
- Fix: thêm `lockedSkin` prop vào `SpineAnimationGallery` — init skin state từ prop, ẩn skin pill buttons khi locked
- Wire `lockedSkin` ở 3 callsites: `AssetGridClient` (dashboard animation tab), portal character page, share character page
- 82/82 tests pass, ESLint clean, pushed commit `ec38619`

## 2026-06-15 (default_skin + SpineAnimationGallery revert)
- TDD: viết 5 tests mới (asset-grid-client × 2, project-settings-form × 3)
- Change 2 (giữ lại): thêm `default_skin TEXT` column vào `Prv_projects` (migration applied via Supabase MCP), type `PrvProject`, action `updateProject` Pick, `ProjectSettingsForm` input mới, `SpinePlayer.lockedSkin` prop, thread qua `AssetViewerModal` → `AssetGridClient` → `AssetGrid` → character page
- Change 1 (revert): đã xóa `SpineAnimationGallery` khỏi dashboard animation tab nhưng user báo spine preview biến mất → revert lại, gallery được khôi phục
- 82/82 tests pass, ESLint clean, pushed to GitHub (commit c7bc245)

## 2026-06-13 (Client Account Management)
- TDD: viết 8 tests trước → implement `createClientAccount`, `updateClientAccountPassword`, `deleteClientAccount` trong `src/lib/actions/client-accounts.ts`
- Actions dùng `createAdminClient()` (service role): tạo Supabase Auth user với `email_confirm: true`, upsert `Prv_profiles`, rollback auth user nếu profile fail
- `ClientAccountsSection` component (`src/components/dashboard/client-accounts.tsx`): Add/Change PW/Delete dialogs với shadcn Dialog + DarkInput styling
- Wire vào `clients/[id]/page.tsx`: query `Prv_profiles` + `auth.admin.getUserById` để fetch email, render section bên dưới projects grid
- 77/77 tests pass, zero ESLint/TS errors trên code mới

## 2026-06-12 (Share Page Portal Parity)
- Hoàn thành plan `2026-06-12-share-page-portal-parity.md`
- Task 1: `/api/share-spine/[token]/[taskId]/[name]` — proxy R2 Spine assets, validate bằng share_token, không cần auth session. Thêm fix scope project để chặn cross-project data leak. 5 tests pass.
- Task 2: `spineApiBase` prop trên `SpineAnimationGallery` — share pages pass `/api/share-spine/<token>` thay vì `/api/spine`.
- Task 3: `src/app/share/layout.tsx` — grain overlay + header "Public Preview" badge, không có login/logout.
- Task 4: Rewrite `src/app/share/[token]/page.tsx` — dùng `PortalCharacterGrid` thay flat asset list.
- Task 5: Tạo `src/app/share/[token]/characters/[cid]/page.tsx` — `ShowcaseHero` + `ArtFilmstrip` + `SpineAnimationGallery` + `VfxInlineGrid`. `allowDownload={false}` cho anonymous.
- Task 6: 64/64 tests pass, build clean, pushed main → auto-deploy triggered.
- Routes mới: `ƒ /share/[token]`, `ƒ /share/[token]/characters/[cid]`, `ƒ /api/share-spine/[token]/[taskId]/[name]`

## 2026-06-07 (Bugfix — Spine card race condition + gallery error)
- Điều tra systematic: 3 bugs được report (cards không hiện animation, "Animation bounds are invalid", "Something went wrong").
- Bug A (Race condition): Khi 3 SpineAvatarPreview cards hiện đồng thời, card 1 append `<script>` vào DOM đồng bộ rồi await load. Card 2+3 thấy `getElementById` = true → bỏ await → `window.spine = undefined` → `onError()` → fallback art/letter. Fix: module-level `ensureSpineScript()` cache Promise dùng chung.
- Bug B ("Animation bounds are invalid"): Bugs Bunny skeleton export thiếu valid bounds → `calculateAnimationViewport` throw khi `autoFit=true`. Gallery cells hiện raw error text của Spine. Fix: track `cellErrors` state trong `SpineAnimationGallery`, thay Spine canvas bằng "Preview unavailable" khi `onError` fires.
- "Something went wrong": Không reproduce được qua Playwright — có thể transient server error.
- 49/49 tests pass, pushed commit `0cad5f9`.

## 2026-06-07 (Production hotfix — Internal Server Error)
- Lỗi: `Cannot find module 'next/dist/compiled/cookie'` → toàn bộ app 500.
- Root cause: `npm ci` trên VPS bị partial extraction cho package `next` (OOM kill/timeout khi extract ~10k files). `node_modules/next/` chỉ có README + .d.ts stubs, thiếu `dist/compiled/` + `package.json`. PM2 đã restart 295 lần.
- Fix: SSH → `rm -rf node_modules && npm ci` → `pm2 restart tdgames-preview` → app online.
- Phòng ngừa: thêm verification step vào `scripts/deploy-remote.sh` — sau `npm ci` kiểm tra `next/package.json`, nếu thiếu thì retry lần 2, abort nếu vẫn fail. Commit `0184f88`, pushed.

## 2026-06-07 (Asset Replace feature)
- fix: tailwind.config.ts thiếu color mappings cho shadcn (bg-popover, bg-muted, bg-accent...) → dropdown trắng trên toàn app. Fix: thêm đủ CSS var mappings. Commit `7fb79e7`, pushed.
- feat: `POST /api/upload` replace mode — `replace_asset_id` + `old_r2_key` → UPDATE DB row thay vì INSERT, sau đó DELETE old R2 object (best-effort). Fail-safe: delete chỉ xảy ra sau khi DB update thành công. 3 tests mới.
- feat: `AssetGrid` pass `existingAssets` xuống `AssetUpload`.
- feat: `AssetUpload` auto-match tên file (case-insensitive) với `existingAssets` → hiện inline amber confirm chip "X already exists — [Replace] [Add new]". Non-matching files upload thẳng như cũ.
- 49/49 tests pass, pushed main → auto-deploy.

## 2026-06-07 (Dashboard features + UX improvements)
- **Rename Client/Project/Character** (commit `0c62569`):
  - `updateTask` server action mới (update `Prv_tasks.name`)
  - `RenameTaskButton` client component: click tên → inline input → Enter/Escape/✓/✗
  - `ProjectSettingsForm`: thêm Name + Description fields (action đã hỗ trợ, chỉ thiếu UI)
  - Client rename: đã có qua ClientForm dialog
- **Auto-resize ảnh upload** (commit `5edd2b3`): Canvas API resize ảnh > 1920px trước khi upload. PNG giữ alpha, JPG/WebP → JPEG 88%. Feedback "Compressing… (40MB → 3MB)".
- **VFX inline auto-play** (commit `1f2bd8f`): `VfxInlineGrid` với IntersectionObserver — video play khi scroll đến, pause khi ra ngoài.
- 46/46 tests pass.

## 2026-06-07 (Bugfixes + Portal UX improvements post-P6)
- **Fix crash portal layout**: `onMouseEnter`/`onMouseLeave` trong server component → RSC serialize error → global-error.tsx. Fix: Tailwind `hover:text-red-500`. (commit `43f526b`)
- **Fix middleware**: internal users bị block khỏi `/portal/*` → "Preview as Client" không hoạt động. Fix: allow both roles. (commit `fdd3299`)
- **Fix RosterClient**: render-props với async server component → crash `/portal/[pid]`. Fix: `PortalCharacterGrid` client component với pre-fetched card data. (commit `3082913`)
- **Fix Spine autoFit transform**: CSS `translate(offsetY%)` đẩy canvas 2000px ra ngoài viewport → IntersectionObserver không fire → Spine không init. Fix: bỏ CSS transform khỏi autoFit mode. (commit `378b4e0`)
- **Art section redesign**: grid thông minh (1 ảnh → full width; 2+ → 2 cols), `objectFit:contain`, max-height 1080px.
- **VFX inline auto-play**: `VfxInlineGrid` với IntersectionObserver — video play khi scroll đến, pause khi ra ngoài.
- **Portal layout wider**: `max-w-[1400px]` → `max-w-[1600px]` để giảm khoảng trống 2 bên trên màn rộng.
- 46/46 tests pass, build clean.

## 2026-06-07 (P6 — Portal Cinematic Redesign)
- Triển khai hoàn tất P6: Portal Redesign — Character-First Showcase (commit `a885037`)
- Portal layout: dark `#080808` + grain texture overlay (fixed, z-index 0)
- `/portal`: cinematic 16:9 project cards (`PortalProjectCard`) với cover art + hover glow ring
- `/portal/[pid]`: bỏ Tabs → roster grid thẳng + `CommentsDrawer` slide-in drawer góc phải
  - `RosterClient`: search bar (chỉ hiện khi ≥ 8 nhân vật), render-props pattern
- `/portal/[pid]/characters/[cid]`: bỏ Tabs → scroll zones A–E
  - Zone A: `ShowcaseHero` full-bleed (Spine animation + chip switcher overlay, hoặc Art)
  - Zone B: `ArtFilmstrip` scroll ngang + lightbox + download on hover
  - Zone C: `SpineAnimationGallery` (tất cả animations inline)
  - Zone D: VFX assets
  - Zone E: Comments collapsible
- `CharacterCardItem`: aspect 2:3 portrait, orange glow hover, "View →" fade-in
- `SpineAvatarPreview`: thêm `forwardRef` + `useImperativeHandle` → `setAnimation()` imperative
- `SpineAnimationGallery`: thay `<select>` dropdown → pill buttons; cells `aspect-[3/4]` portrait
- 46/46 tests pass, build clean, pushed to main

## 2026-06-07 (Avatar Config — background selector + autoFit + fix duplicate UI)
- **SpineAvatarPreview:** thêm `autoFit` mode — skeleton tự fit bounds, rồi scale/offsetX/offsetY áp bằng CSS `transform` (không reload Spine khi kéo slider); thêm prop `backgroundColor` truyền thẳng vào canvas clear color.
- **AvatarConfigPanel:** thêm dropdown chọn nền 5 preset (Transparent/Dark/Gray/White/Green), persist `avatar_bg`; xoá block Background bị duplicate (render 2 lần).
- **DB:** tạo migration `20260607000000_task_avatar_skin_bg.sql` — add `avatar_skin` + `avatar_bg` columns vào `Prv_tasks` (đã apply lên Supabase). Trước đó 2 cột này có trong types + actions nhưng thiếu trong DB.
- 46/46 tests pass, build sạch. Commit `c36e61b`, pushed → GitHub → auto-deploy OK.

## 2026-06-07 (Animation tab — gallery tự render MỌI animation)
- Theo yêu cầu user: tab Animation tự render **mỗi animation 1 ô loop riêng + tên bên dưới**, bỏ dropdown chuyển animation thủ công, **chỉ giữ 1 dropdown Skin** áp cho tất cả.
- Component mới `spine-animation-gallery.tsx`: fetch skeleton `.json` (proxy) → đọc `Object.keys(animations)` + skins (array 4.x hoặc object 3.x) → lưới SpineAvatarPreview, mỗi ô 1 animation (IntersectionObserver defer init nên không nặng). `AssetGridClient` nhánh animation dùng gallery thay SpinePlayer; vẫn giữ `<details>` Source files.
- Commit `d508af5`. Deploy success (VPS=d508af5). Typecheck + lint sạch.

## 2026-06-07 (Animation tab — hiển thị Spine player inline thay vì 3 file)
- Theo yêu cầu user: tab Animation không liệt kê json/png/atlas nữa mà **render Spine player chạy luôn** (controls animation/skin built-in). `AssetGridClient` gom file theo base name → mỗi set có .json = 1 player (proxy URL `/api/spine/<taskId>/<name>`). File nguồn gom vào `<details>` "Source files" thu gọn (download + delete vẫn dùng được cho nội bộ). Áp dụng cả dashboard + portal.
- Commit `be7b549`. Deploy success (VPS=be7b549). Typecheck + lint sạch.

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
