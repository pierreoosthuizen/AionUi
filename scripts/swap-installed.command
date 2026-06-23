#!/bin/bash
# Detached swap: replace /Applications/Agora.app with the fresh local build and
# relaunch. Run from Terminal (NOT from inside Agora) — it quits Agora, and any
# Claude session hosted inside Agora dies with it, so this must run in a separate
# process tree to finish the copy.
set -euo pipefail
SRC="/Users/pierreo/Development/Projects/agora/AionUi/out/mac-arm64/Agora.app"
DEST="/Applications/Agora.app"
[ -d "$SRC" ] || { echo "✗ no fresh build at $SRC"; exit 1; }
echo "Quitting Agora…"
osascript -e 'quit app "Agora"' 2>/dev/null || true
sleep 2
pkill -f "$DEST/Contents/MacOS/Agora" 2>/dev/null || true
sleep 1
echo "Swapping bundle…"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true
echo "Relaunching…"
open "$DEST"
echo "✅ Done — Agora relaunched from fresh build."
