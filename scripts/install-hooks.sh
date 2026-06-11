#!/usr/bin/env bash
# scripts/install-hooks.sh
#
# Cài đặt git hooks cho dự án tdgames_preview.
# Chạy một lần sau khi clone repo:
#
#   bash scripts/install-hooks.sh
#
# Hooks được cài:
#   pre-push  — chạy ESLint trước mỗi push, abort nếu có lỗi.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "📦 Installing git hooks into $HOOKS_DIR..."

# ── pre-push ────────────────────────────────────────────────────────────────
cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/usr/bin/env bash
# .git/hooks/pre-push  (installed via scripts/install-hooks.sh)
#
# Chạy ESLint (next lint) trước mỗi git push.
# Bắt lỗi lint ngay local — không để build fail âm thầm trên VPS.
#
# Bỏ qua (không khuyến nghị): git push --no-verify

set -euo pipefail

echo ""
echo "🔍 Pre-push: running ESLint (next lint)..."

if ! npm run lint 2>&1; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌  ESLint FAILED — push aborted."
  echo ""
  echo "   Fix lint errors, then push again."
  echo "   Bỏ qua hook (không khuyến nghị): git push --no-verify"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 1
fi

echo "✅ ESLint passed — push allowed."
echo ""
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo "  ✅ pre-push installed"

echo ""
echo "✅ All hooks installed. You're good to go."
