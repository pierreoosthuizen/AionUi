/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer presence + auto-pickup for Agora conversations.
 *
 * Problem this solves: Agora's embedded agent runs claude in headless/ACP mode,
 * and the claude-peers MCP child (server.ts) that registers a peer is respawned
 * PER TURN under a fresh, churning peer id. Between turns no server.ts exists, so
 * the conversation has NO broker presence — other peers can't find it, and any
 * message sent to a dead turn-id is purged when that pid dies. Net effect: Agora
 * peers "time out" and silently drop messages.
 *
 * Fix (this module, runs in the long-lived Electron main process): maintain ONE
 * durable "inbox" peer per open conversation, registered with the main process's
 * pid and a stable managed_key (the conversation id). It lives as long as Agora
 * is open — independent of turns — so the conversation is always discoverable and
 * messages addressed to it are never purged mid-flight. On each tick we peek that
 * peer's inbox and inject any new inbound as a turn through aioncore's normal
 * send-message API, wrapped in the <channel source="claude-peers"> envelope the
 * agent's system prompt already knows to answer.
 *
 * ponytail: register-once per conversation (no per-tick re-register storm) — the
 * broker has no time-based eviction, so a managed row persists until its conv
 * closes (we /unregister it) or Agora quits (main pid dies → broker reaps all).
 * Known limit: the agent's OUTBOUND send_message still uses its turn-scoped
 * server.ts id, so a direct reply to that id can be lost after the turn — inbound
 * is fully durable, outbound reply-routing is a separate follow-up.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const BROKER_URL = `http://127.0.0.1:${process.env.CLAUDE_PEERS_PORT ?? '7899'}`;
const POLL_INTERVAL_MS = 2000;
const PEERS_JSON = join(homedir(), '.claude', 'peers', 'peers.json');

interface BrokerMessage {
  id: number;
  from_id: string;
  to_id: string;
  text: string;
  sent_at: string;
}
interface ApiConversation {
  id: string;
  extra?: Record<string, unknown> | null;
}

const injected = new Set<number>();
/** conversationId → durable broker peer id for that conversation's inbox. */
const managed = new Map<string, string>();
let timer: ReturnType<typeof setInterval> | null = null;

/** workspace path → peers.json session_name, read once (peers.json is static at runtime). */
let workspaceToName: Map<string, string> | null = null;
function nameForWorkspace(ws: string): string | undefined {
  if (!workspaceToName) {
    workspaceToName = new Map();
    try {
      const data = JSON.parse(readFileSync(PEERS_JSON, 'utf-8')) as {
        peers?: Array<{ session_name: string; workspace?: string }>;
      };
      for (const p of data.peers ?? []) {
        if (p.workspace) workspaceToName.set(p.workspace, p.session_name);
      }
    } catch {
      /* no peers.json — labels fall back to the workspace basename */
    }
  }
  return workspaceToName.get(ws);
}

function backendPort(): number | undefined {
  return (globalThis as typeof globalThis & { __backendPort?: number }).__backendPort;
}

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
    return null; // broker not running — stay quiet, retry next tick
  }
}

/** Open conversations (id + workspace) from aioncore. */
async function openConversations(port: number): Promise<Array<{ id: string; workspace: string }>> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/conversations?limit=100`);
    if (!res.ok) return [];
    // aioncore envelopes list responses as { success, data: { items, total, has_more } }.
    const body = (await res.json()) as { data?: { items?: ApiConversation[] } };
    const out: Array<{ id: string; workspace: string }> = [];
    for (const c of body.data?.items ?? []) {
      const ws = c.extra && typeof c.extra.workspace === 'string' ? c.extra.workspace : '';
      if (ws) out.push({ id: c.id, workspace: ws });
    }
    return out;
  } catch {
    return []; // aioncore not ready
  }
}

/** Register (once) a durable inbox peer for a conversation; returns its broker id. */
async function ensureManagedPeer(conversationId: string, workspace: string): Promise<string | null> {
  const cached = managed.get(conversationId);
  if (cached) return cached;

  const name = nameForWorkspace(workspace);
  const summary = name
    ? `Agora conversation (${name}) — durable peer inbox`
    : `Agora conversation: ${basename(workspace)} — durable peer inbox`;

  const res = await brokerPost<{ id: string }>('/register', {
    pid: process.pid, // Electron main — all managed peers share it; reaped together on quit
    cwd: workspace,
    git_root: null,
    tty: null,
    summary,
    peer_name: null, // discovered by cwd/summary; avoids colliding with terminal named peers
    managed_key: conversationId,
  });
  if (!res?.id) return null;
  managed.set(conversationId, res.id);
  return res.id;
}

function wrapChannel(m: BrokerMessage): string {
  return `<channel source="claude-peers" from_id="${m.from_id}" sent_at="${m.sent_at}">\n${m.text}\n</channel>`;
}

async function injectTurn(port: number, conversationId: string, input: string): Promise<boolean> {
  try {
    // Wire field is `content` (the ipcBridge sendMessage mapper renames input→content);
    // conversation_id travels in the URL, not the body. Posting `input` yields 400.
    const res = await fetch(`http://127.0.0.1:${port}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: input }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function tick(): Promise<void> {
  const port = backendPort();
  if (!port) return;

  const convs = await openConversations(port);
  if (convs.length === 0) return;

  // Reconcile: drop durable peers for conversations that are no longer open, so a
  // closed conversation doesn't leave a ghost inbox accumulating undeliverable msgs.
  const liveIds = new Set(convs.map((c) => c.id));
  for (const [convId, peerId] of managed) {
    if (!liveIds.has(convId)) {
      await brokerPost('/unregister', { id: peerId });
      managed.delete(convId);
    }
  }

  for (const { id: conversationId, workspace } of convs) {
    const peerId = await ensureManagedPeer(conversationId, workspace);
    if (!peerId) continue;

    const peek = await brokerPost<{ messages: BrokerMessage[] }>('/peek-messages', { id: peerId });
    const messages = peek?.messages;
    if (!Array.isArray(messages) || messages.length === 0) continue;

    for (const m of messages) {
      if (injected.has(m.id)) continue;
      injected.add(m.id);
      const ok = await injectTurn(port, conversationId, wrapChannel(m));
      if (ok)
        console.info(`[AionUi] peer auto-pickup: injected msg ${m.id} from ${m.from_id} → conv ${conversationId}`);
      else injected.delete(m.id); // inject failed (e.g. conversation busy) — retry next tick
    }
  }
}

/** Start the watcher. Safe to call once after the backend is ready. */
export function startPeerAutoPickup(): void {
  if (timer) return;
  timer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
  console.info('[AionUi] peer auto-pickup watcher started');
}

export function stopPeerAutoPickup(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  // Best-effort teardown so durable inbox peers don't linger after the watcher stops.
  for (const [convId, peerId] of managed) {
    void brokerPost('/unregister', { id: peerId });
    managed.delete(convId);
  }
}
