#!/usr/bin/env bash
# scripts/deploy-remote.sh
# Runs ON the VPS (invoked by .github/workflows/deploy.yml after git pull).
#
# Release-dir + symlink swap so a deploy is TRULY atomic: `.next` is a symlink
# that is flipped with a single rename(2). It is never absent for even a moment,
# which was the root cause of the cached-404 character-page crash — the previous
# `mv .next .next-old && mv .next-build .next` left `.next` missing for a few ms,
# and any chunk request in that window got a 404 that browsers/Cloudflare then
# cached *immutably* (Cache-Control: max-age=31536000, immutable).
# See docs/superpowers/specs/2026-06-06-auto-deploy-github-actions-design.md
set -euo pipefail

APP_DIR="/opt/tdgames-preview"
APP_NAME="tdgames-preview"
RELEASES_DIR="$APP_DIR/releases"
KEEP_RELEASES=3
cd "$APP_DIR"

echo "💾 Backing up .env.production..."
cp .env.production /tmp/tdgames-preview.env.bak 2>/dev/null || true

echo "📦 Installing dependencies (npm ci)..."
npm ci

echo "🔨 Building into a fresh release dir; live .next stays up..."
mkdir -p "$RELEASES_DIR"
REL_NAME="rel-$(date +%Y%m%d-%H%M%S)-$$"
REL_DIR="$RELEASES_DIR/$REL_NAME"
rm -rf .next-build
# build-time env (NEXT_PUBLIC_*, etc.)
export $(grep -v '^#' .env.production | xargs)
NEXT_DIST_DIR=.next-build npm run build
mv .next-build "$REL_DIR"

echo "🧷 Carrying previous build's content-hashed chunks forward (no-clobber)..."
# In-flight clients still holding the OLD HTML must be able to load their chunks
# from the NEW release too → no 404 even mid-rollout.
PREV_DIR=""
if [ -L .next ]; then
  PREV_DIR="$(readlink -f .next)"
elif [ -d .next ]; then
  PREV_DIR="$APP_DIR/.next"
fi
if [ -n "$PREV_DIR" ] && [ -d "$PREV_DIR/static/chunks" ]; then
  cp -rn "$PREV_DIR/static/chunks/." "$REL_DIR/static/chunks/" 2>/dev/null || true
fi

echo "🔁 Atomic symlink swap..."
# One-time migration: if .next is still a real directory (legacy layout), move it
# into releases so it can be pruned, then make .next a symlink from here on.
if [ -e .next ] && [ ! -L .next ]; then
  echo "   (migrating legacy real-dir .next → releases/)"
  mv .next "$RELEASES_DIR/legacy-$(date +%Y%m%d-%H%M%S)"
fi
ln -sfn "$REL_DIR" .next.tmp
mv -Tf .next.tmp .next   # single rename(2) — atomic; .next is never absent

echo "🔄 Restarting PM2 process..."
pm2 restart "$APP_NAME" 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

echo "🧹 Pruning old releases (keeping last $KEEP_RELEASES)..."
CURRENT="$(readlink -f .next)"
# shellcheck disable=SC2012
ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  old="${old%/}"
  [ "$old" = "$CURRENT" ] && continue
  rm -rf "$old"
done

echo "💾 Restoring .env.production (in case git reset touched it)..."
cp /tmp/tdgames-preview.env.bak .env.production 2>/dev/null || true

echo "✅ Deploy finished at $(date)"
pm2 show "$APP_NAME" | grep -E 'status|uptime|memory|pid' || true
