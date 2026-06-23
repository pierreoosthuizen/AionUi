#!/usr/bin/env bash
# start-peers.sh — Launch Claude Code peer instances from this project's peers.json.
#
# Delegates to the global ~/.claude/scripts/start-peers.sh for the actual spawn
# logic. This project wrapper adds a --group flag that filters peers by their
# `group` field in peers.json (case-insensitive).
#
# Usage:
#   scripts/start-peers.sh                     # start all auto_start peers
#   scripts/start-peers.sh <name>              # start a specific peer
#   scripts/start-peers.sh --group <name>      # start all peers in a group
#   scripts/start-peers.sh --group <name> --headless
#
# The --group filter reads ~/.claude/peers/peers.json, selects session_names
# whose `group` field matches (case-insensitive), and passes each name
# individually to the global start script. When --group is absent, all
# arguments are forwarded unchanged.

set -euo pipefail

GLOBAL_SCRIPT="${HOME}/.claude/scripts/start-peers.sh"
PEERS_JSON="${HOME}/.claude/peers/peers.json"

# Parse args to detect --group.
GROUP_FILTER=""
PASSTHROUGH_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --group)
            if [[ $# -lt 2 ]]; then
                echo "Error: --group requires a value" >&2
                exit 2
            fi
            GROUP_FILTER="$2"
            shift 2
            ;;
        *)
            PASSTHROUGH_ARGS+=("$1")
            shift
            ;;
    esac
done

# Without --group: forward all args to the global script unchanged.
if [[ -z "$GROUP_FILTER" ]]; then
    exec "$GLOBAL_SCRIPT" "${PASSTHROUGH_ARGS[@]}"
fi

# With --group: resolve peer session_names in that group, then start each one.
if [[ ! -f "$PEERS_JSON" ]]; then
    echo "Error: peers.json not found at $PEERS_JSON" >&2
    exit 1
fi

# Collect session_names whose group matches (case-insensitive).
mapfile -t GROUP_PEERS < <(python3 - "$PEERS_JSON" "$GROUP_FILTER" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
needle = sys.argv[2].lower()
for p in data["peers"]:
    if p.get("group", "").lower() == needle and p.get("session_name"):
        print(p["session_name"])
PYEOF
)

if [[ ${#GROUP_PEERS[@]} -eq 0 ]]; then
    echo "No peers found in group '${GROUP_FILTER}'" >&2
    exit 2
fi

echo "Starting peers in group '${GROUP_FILTER}' (${#GROUP_PEERS[@]} peer(s))..."

for NAME in "${GROUP_PEERS[@]}"; do
    "$GLOBAL_SCRIPT" "${PASSTHROUGH_ARGS[@]+"${PASSTHROUGH_ARGS[@]}"}" "$NAME"
done

echo "Done — ${#GROUP_PEERS[@]} peer(s) in group '${GROUP_FILTER}' started."
