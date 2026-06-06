#!/usr/bin/env bash
# scripts/deploy-remote.sh
# Runs ON the VPS (invoked by .github/workflows/deploy.yml after git pull).
# Atomic build/swap so a deploy never serves a transient 404 for a JS chunk —
# the root cause of the cached-404 character-page crash (see
# docs/superpowers/specs/2026-06-06-auto-deploy-github-actions-design.md).
set -euo pipefail

APP_DIR="/opt/tdgames-preview"
APP_NAME="tdgames-preview"
cd "$APP_DIR"

echo "💾 Backing up .env.production..."
cp .env.production /tmp/tdgames-preview.env.bak 2>/dev/null || true

echo "📦 Installing dependencies (npm ci)..."
npm ci

echo "🔨 Building into side dir (.next-build); live .next stays up..."
rm -rf .next-build
export $(grep -v '^#' .env.production | xargs)   # build-time env (NEXT_PUBLIC_*, etc.)
NEXT_DIST_DIR=.next-build npm run build

echo "🔁 Atomic swap..."
rm -rf .next-old
mv .next .next-old
mv .next-build .next
# Carry the previous build's content-hashed chunks forward (no-clobber) so
# in-flight clients still holding the OLD HTML can load their chunks → no 404.
cp -rn .next-old/static/chunks/. .next/static/chunks/ 2>/dev/null || true

echo "🔄 Restarting PM2 process..."
pm2 restart "$APP_NAME" 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

echo "🧹 Cleaning up previous build..."
rm -rf .next-old

echo "💾 Restoring .env.production (in case git reset touched it)..."
cp /tmp/tdgames-preview.env.bak .env.production 2>/dev/null || true

echo "✅ Deploy finished at $(date)"
pm2 show "$APP_NAME" | grep -E 'status|uptime|memory|pid' || true
