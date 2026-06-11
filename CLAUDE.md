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
- **Phase đang làm:** Bugfix + incremental features (tất cả P1–P6 đã xong)
- **Branch hiện tại:** `main`
- **Vừa hoàn thành (commit `08ddf18`):**
  - chore: Discord deploy notifications — `scripts/deploy-remote.sh` gửi alert khi deploy fail/success
  - chore: pre-push lint hook — `npm run lint` chạy trước mỗi push, abort nếu ESLint error
  - `scripts/install-hooks.sh` — script để team member cài hook sau khi clone
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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tdgames_preview** (731 symbols, 1457 relationships, 48 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/tdgames_preview/context` | Codebase overview, check index freshness |
| `gitnexus://repo/tdgames_preview/clusters` | All functional areas |
| `gitnexus://repo/tdgames_preview/processes` | All execution flows |
| `gitnexus://repo/tdgames_preview/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
