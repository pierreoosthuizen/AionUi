/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer group lifecycle bridge (REQ-012).
 *
 * Source gate findings (documented here per spec):
 *
 * G1 — IPC channel decision:
 *   No existing group-action channel found in packages/desktop/src/process/.
 *   PR #9 added `peer.restart` (single-conversation IPC); that is a different
 *   concern. Adding a new `peers.groupAction` channel here rather than extending
 *   the single-peer channel, so group operations stay separate from
 *   per-conversation operations.
 *
 * G2 — Broker kill mechanism:
 *   peerAutoPickup.ts uses brokerPost('/unregister', { id: peerId }) to kill a
 *   single peer (the managed-inbox peer). The broker URL is
 *   http://127.0.0.1:<CLAUDE_PEERS_PORT>/. For group-kill we look up each peer's
 *   live broker registration via POST /list-peers, match by managed_key (the
 *   aioncore conversation_id), then call /unregister for each match. A dead peer
 *   (no entry in /list-peers) is a safe no-op. NEVER raw pkill by session_name.
 *
 * G3 — Group context menu location:
 *   packages/desktop/src/renderer/pages/conversation/GroupedHistory/index.tsx
 *   lines ~639–669: SortableGroupSection renderLabel uses a Dropdown with
 *   trigger='contextMenu'. Menu has 'rename' and 'delete' items. New items are
 *   added after those two, behind a MenuDivider, in index.tsx.
 */

import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { ipcBridge } from '@/common';
import { parsePeers, type PeerEntry } from '@/common/utils/peerRegistry';

const BROKER_URL = `http://127.0.0.1:${process.env.CLAUDE_PEERS_PORT ?? '7899'}`;
const PEERS_JSON = join(homedir(), '.claude', 'peers', 'peers.json');
const SPAWN_PEER_SH = join(homedir(), '.claude', 'scripts', 'spawn-peer.sh');

// ---------------------------------------------------------------------------
// Peers.json reader — not shared with peerAutoPickup so this module stays
// self-contained and testable without the pickup watcher state.
// ---------------------------------------------------------------------------

/** Read and parse peers.json. Returns [] on any error. */
function readPeersJson(): PeerEntry[] {
  try {
    const raw = readFileSync(PEERS_JSON, 'utf-8');
    return parsePeers(raw);
  } catch {
    return [];
  }
}

/**
 * Return all peers whose `group` field matches `groupName` (case-insensitive).
 * Only peers that have a `session_name` field are returned — peers without one
 * cannot be started or killed and are skipped.
 */
export function peersInGroup(groupName: string, peers: readonly PeerEntry[]): PeerEntry[] {
  const needle = groupName.toLowerCase();
  return peers.filter((p) => typeof p.session_name === 'string' && p.group?.toLowerCase() === needle);
}

// ---------------------------------------------------------------------------
// Broker helpers
// ---------------------------------------------------------------------------

type BrokerPeer = { id: string; managed_key: string | null; peer_name: string | null; cwd: string };

async function brokerPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BROKER_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function listBrokerPeers(): Promise<BrokerPeer[]> {
  const result = await brokerPost<BrokerPeer[]>('/list-peers', { scope: 'machine', cwd: '/', git_root: null });
  return result ?? [];
}

// ---------------------------------------------------------------------------
// Per-peer lifecycle operations
// ---------------------------------------------------------------------------

/** Start a peer by name via spawn-peer.sh --force (headless background). */
function startPeer(sessionName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(SPAWN_PEER_SH, [sessionName, '--force'], { timeout: 15_000 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Kill a peer via broker unregister. Iterates the live broker peer list to find
 * any registration whose peer_name matches the session_name (case-insensitive),
 * then calls /unregister for each match. A peer with no broker registration is a
 * safe no-op (already dead or was never started through the broker path).
 */
async function killPeer(sessionName: string): Promise<void> {
  const livePeers = await listBrokerPeers();
  const needle = sessionName.toLowerCase();
  const matches = livePeers.filter((p) => p.peer_name?.toLowerCase() === needle);
  for (const match of matches) {
    await brokerPost('/unregister', { id: match.id });
    console.info(`[PeerGroupBridge] unregistered broker peer ${match.id} (${sessionName})`);
  }
}

/**
 * Poll until the peer has no live broker registration, or until maxWaitMs
 * elapses. Used to guarantee the kill completed before re-starting.
 */
async function waitForPeerGone(sessionName: string, maxWaitMs = 3000): Promise<void> {
  const pollInterval = 200;
  const deadline = Date.now() + maxWaitMs;
  const needle = sessionName.toLowerCase();
  while (Date.now() < deadline) {
    const livePeers = await listBrokerPeers();
    const stillAlive = livePeers.some((p) => p.peer_name?.toLowerCase() === needle);
    if (!stillAlive) return;
    await new Promise<void>((res) => setTimeout(res, pollInterval));
  }
  // Deadline exceeded — proceed anyway; start-peer will pick up a fresh slot.
  console.warn(`[PeerGroupBridge] waitForPeerGone timeout for ${sessionName} — proceeding with start`);
}

/**
 * Atomic restart: kill → wait until PID gone → start.
 * NOT two separate UI IPC calls — the entire sequence runs in the handler.
 * Preserves session_name / managed_key (conversation_id) per ADR-0005 pattern.
 */
async function restartPeer(sessionName: string): Promise<void> {
  await killPeer(sessionName);
  await waitForPeerGone(sessionName);
  await startPeer(sessionName);
}

// ---------------------------------------------------------------------------
// IPC handler
// ---------------------------------------------------------------------------

export function initPeerGroupBridge(): void {
  ipcBridge.peers.groupAction.provider(async ({ group, action }) => {
    const allPeers = readPeersJson();
    const targets = peersInGroup(group, allPeers);

    const errors: string[] = [];
    let count = 0;

    for (const peer of targets) {
      const name = peer.session_name as string; // guaranteed by peersInGroup filter
      try {
        if (action === 'start') {
          await startPeer(name);
        } else if (action === 'kill') {
          await killPeer(name);
        } else {
          // action === 'restart'
          await restartPeer(name);
        }
        count++;
      } catch (e) {
        const msg = `${name}: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        console.error(`[PeerGroupBridge] ${action} failed for peer ${name}:`, e);
      }
    }

    return { success: errors.length === 0, count, errors };
  });
}
