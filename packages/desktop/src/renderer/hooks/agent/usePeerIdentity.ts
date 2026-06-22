/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';
import { CHAT_INPUT_ACCENTS, type ChatInputAccent } from '@/common/config/chatInputAccent';
import { parsePeers, resolvePeerEntry, type PeerEntry } from '@/common/utils/peerRegistry';

/**
 * Resolve a conversation's claude-peers identity (name + colour) from the CLI
 * peers registry, by matching the conversation workspace. Mirrors how the CLI
 * derives a session's identity from its cwd — gives AionUi conversations the
 * same visible name+colour parity. Non-peer workspaces resolve to null.
 */
export type PeerIdentity = { alias: string; colour: ChatInputAccent; group?: string };

// ponytail: fork-local — Pierre's peers registry, single source of truth for
// peer name+colour. Home hardcoded (personal single-user fork). Switch to a
// resolved home if this ever ships beyond this machine.
const PEERS_JSON = '/Users/pierreo/.claude/peers/peers.json';

const VALID_COLOURS = new Set<string>(CHAT_INPUT_ACCENTS);

let cache: Promise<PeerEntry[]> | null = null;

function loadPeers(force = false): Promise<PeerEntry[]> {
  if (cache && !force) return cache;
  cache = fs.readFile
    .invoke({ path: PEERS_JSON })
    .then((raw) => parsePeers(raw || ''))
    .catch(() => [] as PeerEntry[]);
  return cache;
}

function toIdentity(entry: PeerEntry): PeerIdentity | null {
  if (!entry.alias) return null;
  const colour = (entry.colour && VALID_COLOURS.has(entry.colour) ? entry.colour : 'default') as ChatInputAccent;
  return { alias: entry.alias, colour, group: entry.group?.trim() || undefined };
}

/**
 * Resolve an entry, reloading peers.json once if the first lookup misses. This
 * self-heals the case where peers.json gained the entry AFTER Agora launched —
 * the session-lifetime cache would otherwise miss it until an app restart.
 */
async function resolveWithReload(workspace: string): Promise<PeerEntry | undefined> {
  let entry = resolvePeerEntry(workspace, await loadPeers());
  if (!entry) entry = resolvePeerEntry(workspace, await loadPeers(true));
  return entry;
}

/** Resolve a workspace's peer group name (from peers.json), or undefined. */
export async function resolvePeerGroup(workspace: string): Promise<string | undefined> {
  return (await resolveWithReload(workspace))?.group?.trim() || undefined;
}

export function usePeerIdentity(workspace?: string): PeerIdentity | null {
  const [identity, setIdentity] = useState<PeerIdentity | null>(null);
  useEffect(() => {
    if (!workspace) {
      setIdentity(null);
      return;
    }
    let alive = true;
    void resolveWithReload(workspace).then((entry) => {
      if (alive) setIdentity(entry ? toIdentity(entry) : null);
    });
    return () => {
      alive = false;
    };
  }, [workspace]);
  return identity;
}
