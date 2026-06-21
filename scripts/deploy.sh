#!/usr/bin/env bash
#
# deploy.sh — commit, push, rebuild, and install Agora into /Applications.
#
# FAST is the default: dir-only build (no DMG/zip), light gate (tsc + push).
# Use --full for the gated, shippable build (full test suite + DMG/zip artifacts).
#
# Usage:
#   scripts/deploy.sh "feat(scope): message"          # fast: commit, tsc, push, dir-build, install
#   scripts/deploy.sh                                  # fast, tree clean: rebuild + reinstall HEAD
#   scripts/deploy.sh --full "feat(scope): message"   # full gate + DMG (shippable)
#
# ponytail: arm64-only, macOS-only — personal build. Add --x64/universal when needed.
set -euo pipefail
cd "$(dirname "$0")/.."

# Parse args: --full flag (any position) + first non-flag = commit message.
FULL=false
MSG=""
for arg in "$@"; do
  case "$arg" in
    --full) FULL=true ;;
    *) [[ -z "$MSG" ]] && MSG="$arg" ;;
  esac
done

APP_NAME="Agora"
APP_SRC="out/mac-arm64/${APP_NAME}.app"
APP_DEST="/Applications/${APP_NAME}.app"

# 1. Commit any working-tree changes (requires a message).
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ -z "$MSG" ]]; then
    echo "✗ Uncommitted changes present. Pass a commit message:" >&2
    echo "    scripts/deploy.sh \"feat(scope): what changed\"" >&2
    exit 1
  fi
  git add -A
  git commit -m "$MSG"
else
  echo "• No working-tree changes to commit."
fi

# 2. Gate + push.
if $FULL; then
  # Full gate (lint → format-check → typecheck → test → push).
  just push
else
  # Fast gate: typecheck only, then plain push. Lint/format/tests run during dev.
  echo "⚡ fast deploy: typecheck + push (skipping full test gate; use --full to run it)"
  bunx tsc --noEmit
  git push
fi

# 3. Build the app bundle. --force guarantees a fresh Vite build (never ship a
#    stale or 0-byte renderer). afterPack bundles aioncore into the .app either way.
if $FULL; then
  # Full build → DMG + zip distributables.
  node scripts/build-with-builder.js auto --mac --arm64 --force
else
  # Fast build → dir target: .app only, no DMG/zip/blockmap packaging.
  node scripts/build-with-builder.js auto --mac dir --arm64 --force
fi

[[ -d "$APP_SRC" ]] || { echo "✗ Build did not produce $APP_SRC" >&2; exit 1; }

# 4. Swap into /Applications: quit the running app, replace, de-quarantine.
osascript -e "quit app \"${APP_NAME}\"" 2>/dev/null || true
pkill -f "${APP_DEST}" 2>/dev/null || true
sleep 1
rm -rf "$APP_DEST"
cp -R "$APP_SRC" "$APP_DEST"
xattr -dr com.apple.quarantine "$APP_DEST" 2>/dev/null || true

# 5. Relaunch.
open "$APP_DEST"
AGORA_VERSION="$(grep -oE "AGORA_VERSION = '[^']+'" packages/desktop/src/common/agoraVersion.ts | grep -oE "[0-9]+\.[0-9]+" || echo '?')"
echo "✅ Deployed ${APP_NAME} v${AGORA_VERSION} → ${APP_DEST} (relaunched)."
if $FULL; then
  echo "   Shareable DMG: $(ls out/${APP_NAME}-*-mac-arm64.dmg 2>/dev/null | tail -1 || echo '(none)')"
fi
