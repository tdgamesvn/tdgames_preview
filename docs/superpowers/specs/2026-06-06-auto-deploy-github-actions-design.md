# Auto-Deploy via GitHub Actions — Design

**Date:** 2026-06-06
**Status:** Approved (design)
**Author:** Claude + tdgames

## Goal

Auto-deploy `tdgames_preview` to the VPS on every push to `main`, mirroring the
`tdgames-platforms` setup. Fold in an **atomic build/swap** so deploys never
serve a transient 404 for a referenced JS chunk — the root cause of the
"SOMETHING WENT WRONG" character-page crash (Cloudflare cached a deploy-window
404; see `.agent/meta/LOG.md` 2026-06-06).

Out of scope (explicitly dropped by user): automatic Cloudflare cache purge.

## Background — the bug this prevents

The current deploy runs `npm run build` in place. `next build` wipes `.next`
and regenerates it over ~30–60s. During that window the route chunk
(`969-….js`) does not exist on disk → any request → origin 404 → Cloudflare
edge cached that 404 for 7 days → users saw a hard crash even though the origin
later became healthy. Verified via Playwright console + `cf-cache-status: HIT`
on a 404 while origin (`:3001`) returned 200.

## Architecture

Two committed pieces + one-time GitHub/VPS setup.

### 1. Trigger branch: `main`
- Production moves from `feat/p1-foundation-auth` → `main`.
- One-time: merge `feat/p1-foundation-auth` → `main`, push `origin/main`,
  repoint the VPS checkout to `main`.
- From then on: push to `main` ⇒ auto-deploy.

### 2. Workflow: `.github/workflows/deploy.yml`
- `on: push: branches: [main]`
- `appleboy/ssh-action@v1` SSHes into the VPS using repo secrets
  (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`) — same VPS as platforms,
  so the same secret values are copied into this repo.
- Remote script: `git reset --hard origin/main` then runs the committed
  `scripts/deploy-remote.sh` (the freshly-pulled version).

### 3. Atomic build/swap: `scripts/deploy-remote.sh` (runs ON the VPS)
Steps:
1. Backup `.env.production` (lives on server, not in repo) to `/tmp`.
2. `npm ci`.
3. **Build to a side directory** so the live `.next` stays intact during the
   slow build: `NEXT_DIST_DIR=.next-build npm run build`.
   - Requires `next.config.mjs` to honor the env:
     `distDir: process.env.NEXT_DIST_DIR || '.next'`.
4. **Fast swap (sub-second):**
   ```
   mv .next .next-old
   mv .next-build .next
   cp -rn .next-old/static/chunks/. .next/static/chunks/   # carry old chunks forward (no-clobber)
   pm2 restart tdgames-preview
   rm -rf .next-old
   ```
   - The `cp -n` overlays the **previous build's** hashed chunks into the new
     `.next/static/chunks/` without overwriting new ones. Because chunk
     filenames are content-hashed (no collisions), the freshly-restarted server
     can serve BOTH the old HTML's chunks (for in-flight clients) and the new
     ones → **no 404 window at all**.
5. Restore `.env.production`.
6. Print `pm2` status.

### One-time GitHub setup (user, via GitHub UI — gh CLI auth is broken locally)
Add repo secrets to `tdgamesvn/tdgames_preview`:
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (copy the values from
`tdgames-platforms`).

## Error handling
- `set -euo pipefail` in the remote script; any failed step aborts before the
  swap, so a broken build never replaces the live `.next` (old site keeps
  running).
- `.env.production` backup/restore guards against an accidental wipe by
  `git reset --hard`.

## Testing / verification
- No unit-test surface (infra). Verify by:
  1. Trigger a deploy (push to `main`), watch the Action succeed.
  2. During/after deploy, `curl -I` a route chunk over the public URL → expect
     200 throughout (never 404).
  3. Playwright: open the character page, assert 0 console errors.

## Risks
- VPS disk ~76% used: the side-build doubles `.next` briefly (~tens of MB) plus
  carried-forward old chunks. Acceptable; `.next-old` is removed each deploy.
- True zero-downtime (cluster reload / release symlinks) is out of scope; the
  overlay approach already removes the 404 window, which is the actual goal.
