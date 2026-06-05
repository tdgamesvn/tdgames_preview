# Decisions — tdgames_preview

## 2026-06-05

### Auth: Supabase email/password (không phải OAuth)
- Lý do: clients là doanh nghiệp B2B, không phải consumer — không cần Google/GitHub login
- Internal team quản lý tài khoản thủ công qua Supabase Dashboard

### Storage: Cloudflare R2 (không phải Supabase Storage)
- Lý do: R2 không tính phí egress, phù hợp với file preview lớn (video, PSD, Spine bundles)
- Presigned URL pattern: browser upload trực tiếp lên R2, không qua server

### DB prefix: `Prv_`
- Lý do: cùng Supabase project với tdgames-platforms trong tương lai, tránh collision tên bảng

### Spine version: per-project (không phải per-asset)
- Lý do: 1 project thường chỉ dùng 1 phiên bản Spine, giảm phức tạp khi load runtime JS

### Route protection: Next.js Middleware (không phải RSC-level guard)
- Lý do: middleware chạy ở edge, redirect trước khi page render — UX tốt hơn, không flash content

### Supabase SSR: `@supabase/ssr` (không phải `@supabase/auth-helpers-nextjs`)
- Lý do: `auth-helpers-nextjs` đã deprecated, `@supabase/ssr` là standard hiện tại

### Testing: Jest + React Testing Library (không phải Playwright cho P1)
- Lý do: P1 chủ yếu là logic thuần (redirect rules, form state) — unit test đủ; E2E để sau khi có real Supabase project
