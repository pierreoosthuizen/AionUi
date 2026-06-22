/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer-task scheduler (ADR-0002) — fires peer-targeted scheduled tasks by pushing
 * the prompt into an active claude-peers peer's CURRENT conversation.
 *
 * Realities named in code (ADR-0002 §5):
 *   (a) timer drift  → one coarse scan tolerates it; never fire-on-the-second.
 *   (b) system sleep → setInterval pauses; on wake, overdue slots roll forward
 *       without firing (decideFire → 'rollforward'), no stale catch-up.
 *   (c) single scan loop over all tasks, NOT one timer per task.
 *
 * Delivery: resolve the task's managed_key against the broker's live peer list;
 * if the chat is live, POST /send-message to its current id (the MCP server
 * injects it as a user turn into that conversation). If not live → silent skip:
 * record status, emit NO message/prompt/notification.
 */

import type { IActivePeer, IPeerTask } from '@/common/adapter/ipcBridge';
import { decideFire, computeNextRun } from './peerTaskSchedule';
import { listTasks, updateTask, getTask } from './peerTaskStore';

const SCAN_MS = 60_000;
const BROKER_URL = `http://127.0.0.1:${process.env.CLAUDE_PEERS_PORT ?? '7899'}`;

type BrokerPeer = { id: string; managed_key: string | null; peer_name: string | null; cwd: string };

async function listPeers(): Promise<BrokerPeer[]> {
  try {
    const res = await fetch(`${BROKER_URL}/list-peers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope: 'machine', cwd: '/', git_root: null }),
    });
    if (!res.ok) return [];
    return (await res.json()) as BrokerPeer[];
  } catch {
    return [];
  }
}

/** Managed (chat-backed) peers only — the valid task targets for the picker. */
export async function listActivePeers(): Promise<IActivePeer[]> {
  const peers = await listPeers();
  return peers.filter((p) => p.managed_key != null).map((p) => ({ managed_key: p.managed_key as string, peer_name: p.peer_name, cwd: p.cwd }));
}

/** Push the prompt into the peer's live conversation, or silent-skip if not active. */
async function fire(task: IPeerTask): Promise<{ status: 'sent' | 'skipped' | 'error'; error?: string }> {
  try {
    const peers = await listPeers();
    const match = peers.find((p) => p.managed_key === task.managed_key);
    if (!match) return { status: 'skipped' }; // peer not active → fail silently (ADR-0002 §2/§3)
    const res = await fetch(`${BROKER_URL}/send-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from_id: 'agora-cron', to_id: match.id, text: task.prompt }),
    });
    return res.ok ? { status: 'sent' } : { status: 'error', error: `broker ${res.status}` };
  } catch (error) {
    return { status: 'error', error: String(error) };
  }
}

async function scan(): Promise<void> {
  const now = Date.now();
  for (const task of listTasks()) {
    const decision = decideFire(task, now);
    if (decision === 'idle') continue;
    const patch: Partial<IPeerTask> = { next_run_at_ms: computeNextRun(task, now + 1000) };
    if (decision === 'fire') {
      const result = await fire(task);
      patch.last_run_at_ms = now;
      patch.last_status = result.status;
      patch.last_error = result.error;
    }
    // 'rollforward' only advances next_run — no fire, no status change (slept past it).
    try {
      updateTask(task.id, patch);
    } catch {
      // task deleted mid-scan → nothing to update
    }
  }
}

/** Fire a task immediately, ignoring its schedule (manual run / "run now" button). */
export async function fireNow(id: string): Promise<{ status: 'sent' | 'skipped' | 'error'; error?: string }> {
  const task = getTask(id);
  if (!task) throw new Error(`peer task not found: ${id}`);
  const result = await fire(task);
  updateTask(id, { last_run_at_ms: Date.now(), last_status: result.status, last_error: result.error });
  return result;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startPeerTaskScheduler(): void {
  if (timer) return;
  timer = setInterval(() => void scan().catch((e) => console.warn('[AionUi] peer-task scan failed:', e)), SCAN_MS);
  void scan().catch((e) => console.warn('[AionUi] peer-task scan failed:', e));
  console.info('[AionUi] peer-task scheduler started');
}

export function stopPeerTaskScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
