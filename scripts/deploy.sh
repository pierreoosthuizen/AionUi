#!/usr/bin/env bash
#
# deploy.sh — commit, push, rebuild, and install Agora into /Applications.
#
# Usage:
#   scripts/deploy.sh "feat(scope): message"   # commit changes, push, build, install
#   scripts/deploy.sh                           # tree clean: just rebuild + reinstall HEAD
#
# ponytail: arm64-only, macOS-only — personal build. Add --x64/universal when needed.
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-}"
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

# 2. Push through the full gate (lint → format-check → typecheck → test → push).
just push

# 3. Build a working app bundle. --force guarantees a fresh Vite build (never ship a
#    stale or 0-byte renderer); the full build path bundles aioncore into the .app.
node scripts/build-with-builder.js auto --mac --arm64 --force

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
echo "   Shareable DMG: $(ls out/${APP_NAME}-*-mac-arm64.dmg 2>/dev/null | tail -1 || echo '(none)')"
