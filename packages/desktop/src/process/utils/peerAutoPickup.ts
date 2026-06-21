/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer auto-pickup — surface inbound claude-peers channel messages without a nudge.
 *
 * Agora's embedded agent runs the claude binary in headless/ACP mode. Its
 * claude-peers MCP child (server.ts) emits `notifications/claude/channel` on an
 * inbound message, but headless claude ignores it while idle (no interactive loop
 * to start a turn from). So a peer message only surfaces when the user manually
 * runs check_messages inside a turn.
 *
 * This watcher closes that gap from the app layer: it polls the broker's read-only
 * /peek-messages for each open conversation's peer and, on a new inbound, injects a
 * turn through aioncore's normal send-message API — the same path a typed message
 * uses — wrapped in the <channel source="claude-peers"> envelope the agent's system
 * prompt already knows to answer. The agent replies in real time, zero nudge.
 *
 * ponytail: peek is detect-only (never consumes); de-dupe is an in-process Set of
 * broker message ids. We do NOT mark delivered — the broker purges a peer's
 * undelivered rows when it dies (conversation close / app quit), and ids are
 * globally monotonic, so a fresh session never re-injects an old message. The only
 * residue: a manual check_messages could re-show an auto-picked message until the
 * peer dies. Acceptable for a personal build; mark-delivered via /poll-messages if
 * that ever bites. cwd→conversation maps by workspace; two conversations in one
 * workspace share a peer — we inject into the most recently active match.
 */

const BROKER_URL = `http://127.0.0.1:${process.env.CLAUDE_PEERS_PORT ?? '7899'}`;
const POLL_INTERVAL_MS = 2000;

interface BrokerPeer {
  id: string;
  cwd: string;
  last_seen?: string;
}
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
let timer: ReturnType<typeof setInterval> | null = null;

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

/** Most-recent peer per cwd (alive — /list-peers already filters dead pids). */
async function peersByCwd(): Promise<Map<string, string>> {
  const peers = await brokerPost<BrokerPeer[]>('/list-peers', { scope: 'machine', cwd: '', git_root: null });
  const map = new Map<string, string>();
  if (!Array.isArray(peers)) return map;
  for (const p of peers) {
    if (p.cwd) map.set(p.cwd, p.id); // later rows (more recent registration order) win
  }
  return map;
}

/** Open conversations → workspace, from aioncore. */
async function conversationsByWorkspace(port: number): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/conversations?limit=100`);
    if (!res.ok) return map;
    const data = (await res.json()) as { items?: ApiConversation[] } | ApiConversation[];
    const list = Array.isArray(data) ? data : (data.items ?? []);
    for (const c of list) {
      const ws = c.extra && typeof c.extra.workspace === 'string' ? c.extra.workspace : '';
      if (ws) map.set(ws, c.id); // last wins → most recent in default ordering
    }
  } catch {
    /* aioncore not ready */
  }
  return map;
}

function wrapChannel(m: BrokerMessage): string {
  return `<channel source="claude-peers" from_id="${m.from_id}" sent_at="${m.sent_at}">\n${m.text}\n</channel>`;
}

async function injectTurn(port: number, conversationId: string, input: string): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input, conversation_id: conversationId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function tick(): Promise<void> {
  const port = backendPort();
  if (!port) return;

  const [cwdToPeer, wsToConv] = await Promise.all([peersByCwd(), conversationsByWorkspace(port)]);
  if (cwdToPeer.size === 0 || wsToConv.size === 0) return;

  for (const [ws, conversationId] of wsToConv) {
    const peerId = cwdToPeer.get(ws);
    if (!peerId) continue; // no live peer for this conversation's workspace

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
}
