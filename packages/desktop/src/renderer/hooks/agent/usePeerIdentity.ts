/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';
import { type ChatInputAccent } from '@/common/config/chatInputAccent';

/**
 * Resolve a conversation's claude-peers identity (name + colour) from the CLI
 * peers registry, by matching the conversation workspace. Mirrors how the CLI
 * derives a session's identity from its cwd — gives AionUi conversations the
 * same visible name+colour parity. Non-peer workspaces resolve to null.
 */
export type PeerIdentity = { alias: string; colour: ChatInputAccent };

// ponytail: fork-local — Pierre's peers registry, single source of truth for
// peer name+colour. Home hardcoded (personal single-user fork). Switch to a
// resolved home if this ever ships beyond this machine.
const PEERS_JSON = '/Users/pierreo/.claude/peers/peers.json';

const VALID_COLOURS = new Set<string>(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'default']);

let cache: Promise<Map<string, PeerIdentity>> | null = null;

function loadPeers(): Promise<Map<string, PeerIdentity>> {
  if (cache) return cache;
  // Read once per session; peers.json is effectively static at runtime.
  cache = fs.readFile
    .invoke({ path: PEERS_JSON })
    .then((raw) => {
      const map = new Map<string, PeerIdentity>();
      if (!raw) return map;
      const data = JSON.parse(raw) as { peers?: Array<{ workspace?: string; alias?: string; colour?: string }> };
      for (const peer of data.peers ?? []) {
        if (!peer.workspace || !peer.alias) continue;
        const colour = (peer.colour && VALID_COLOURS.has(peer.colour) ? peer.colour : 'default') as ChatInputAccent;
        map.set(peer.workspace, { alias: peer.alias, colour });
      }
      return map;
    })
    .catch(() => new Map<string, PeerIdentity>());
  return cache;
}

export function usePeerIdentity(workspace?: string): PeerIdentity | null {
  const [identity, setIdentity] = useState<PeerIdentity | null>(null);
  useEffect(() => {
    if (!workspace) {
      setIdentity(null);
      return;
    }
    let alive = true;
    void loadPeers().then((map) => {
      if (alive) setIdentity(map.get(workspace) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [workspace]);
  return identity;
}
