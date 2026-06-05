# Activity Log — tdgames_preview

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
