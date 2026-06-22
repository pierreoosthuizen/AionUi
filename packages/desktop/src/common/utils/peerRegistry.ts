/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared resolver for the claude-peers registry (peers.json). The renderer
 * (usePeerIdentity) and the main process (peerAutoPickup) both map a conversation
 * workspace to its peer entry; routing both through ONE matcher stops the two
 * resolvers drifting — the bug class behind colour/name/group misses. Each process
 * still owns its own file read + cache; only the parse + match algorithm lives here,
 * so this module stays free of fs/IPC and runs unchanged in either process.
 */

/** A peers.json entry — only the fields Agora consumes. */
export type PeerEntry = {
  session_name?: string;
  workspace?: string;
  alias?: string;
  colour?: string;
  group?: string;
};

/** Parse peers.json text into its entry array. Returns [] on any malformed input. */
export function parsePeers(raw: string): PeerEntry[] {
  try {
    const data = JSON.parse(raw) as { peers?: PeerEntry[] };
    return Array.isArray(data.peers) ? data.peers : [];
  } catch {
    return [];
  }
}

/**
 * True when `prefix` equals `path` or is an ANCESTOR directory of it on a path-
 * segment boundary. `/a/b` matches `/a/b` and `/a/b/c`, but NOT `/a/bXtra` — the
 * char after the prefix must be `/` or end-of-string. Guards the live case where
 * one peer workspace (e.g. /WorkSpaces/DiscoveryBank) is a string-prefix of another
 * (/WorkSpaces/DiscoveryBankXtra) that is NOT actually nested under it.
 */
function isPathSegmentPrefix(prefix: string, path: string): boolean {
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest === '' || rest.startsWith('/');
}

/**
 * Match a conversation workspace to its peers.json entry. Exact path match wins;
 * otherwise the LONGEST peer workspace that is a path-segment ancestor of the
 * conversation workspace — so a conversation opened in a subdirectory of a peer's
 * workspace (e.g. a BTS work-item dir under /WorkSpaces/DiscoveryBank) still
 * resolves to that peer. Shared by both processes so the match rule can't drift.
 */
export function resolvePeerEntry(workspace: string, peers: readonly PeerEntry[]): PeerEntry | undefined {
  if (!workspace) return undefined;
  let best: PeerEntry | undefined;
  let bestLen = -1;
  for (const p of peers) {
    if (!p.workspace) continue;
    if (p.workspace === workspace) return p; // exact wins — it is the longest possible match
    if (isPathSegmentPrefix(p.workspace, workspace) && p.workspace.length > bestLen) {
      best = p;
      bestLen = p.workspace.length;
    }
  }
  return best;
}
