#!/usr/bin/env bash
# scripts/deploy-vps.sh
# Usage: ./scripts/deploy-vps.sh [branch]
# Default branch: feat/p1-foundation-auth
set -euo pipefail

VPS="root@vps6core"
APP_DIR="/opt/tdgames-preview"
BRANCH="${1:-feat/p1-foundation-auth}"

echo "==> Deploying branch '$BRANCH' to vps6core..."

ssh "$VPS" bash << REMOTE
set -euo pipefail
cd $APP_DIR

echo "--- git pull ---"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo "--- npm ci ---"
npm ci

echo "--- npm run build ---"
export \$(grep -v '^#' .env.production | xargs)
npm run build

echo "--- pm2 restart ---"
pm2 restart tdgames-preview 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

echo "--- status ---"
pm2 show tdgames-preview | grep -E 'status|uptime|memory|pid'
REMOTE

echo "==> Done. App running at https://preview.tdgamestudio.com"
