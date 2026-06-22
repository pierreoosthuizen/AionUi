/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Metrics recorder — snapshots plan usage + claude-peers activity every 5 minutes
 * into a standalone SQLite db (userData/metrics.db) for later reporting.
 *
 * Sources (all already in the app, no new endpoints):
 *   - plan usage % + reset times → usageBridge.fetchPlanUsage() (OAuth usage endpoint)
 *   - peers open / running / busy → claude-peers broker POST /list-peers (PID-live)
 *   - conversations open / running → aioncore GET /api/conversations
 *   - process memory → process.memoryUsage().rss
 *
 * Runs in the long-lived Electron main process, started after the backend is ready
 * (index.ts), same lifecycle as the peer auto-pickup watcher. Every source degrades
 * to null/0 on failure — a tick never throws, it just records what it could reach.
 *
 * ponytail: own db file (not aioncore's Rust db, not a shared one) — single writer
 * (main), append-only, ~288 rows/day. Two tables so reporting is plain SQL, not
 * JSON-column parsing. No retention/pruning yet — add a DELETE-older-than when the
 * file gets big enough to care (years out at this volume).
 */

import BetterSqlite3 from 'better-sqlite3';
import type DatabaseT from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import { fetchPlanUsage } from '@/process/bridge/usageBridge';
import type { PlanUsage } from '@/common/adapter/ipcBridge';

const INTERVAL_MS = 5 * 60_000;
const BROKER_URL = `http://127.0.0.1:${process.env.CLAUDE_PEERS_PORT ?? '7899'}`;

/** A live peer row as returned by the broker /list-peers endpoint (subset we use). */
export type BrokerPeer = {
  id: string;
  peer_name: string | null;
  managed_key: string | null;
  cwd: string;
  busy?: number;
};

export type ConvCounts = { open: number; running: number };

export type MetricSnapshot = {
  ts: number;
  session_pct: number | null;
  session_resets_at: string | null;
  weekly_pct: number | null;
  weekly_resets_at: string | null;
  peers_running: number;
  peers_open: number;
  peers_busy: number;
  conversations_open: number;
  conversations_running: number;
  rss_bytes: number;
};

export type MetricPeerRow = { peer_name: string | null; managed_key: string; cwd: string; busy: number };

/**
 * Pure: fold the gathered inputs into one snapshot row + per-peer rows. No IO.
 * - peers_running = every live peer the broker reports (it PID-checks inline).
 * - peers_open    = Agora chat peers only (managed_key != null) — the ones with a
 *                   durable conversation, i.e. what "which peers are open" means here.
 * - metric_peer rows are the managed peers only (terminal Claudes have no chat).
 */
export function assembleSnapshot(input: {
  ts: number;
  usage: PlanUsage | null;
  peers: BrokerPeer[];
  convs: ConvCounts;
  rss: number;
}): {
  snapshot: MetricSnapshot;
  peers: MetricPeerRow[];
} {
  const { ts, usage, peers, convs, rss } = input;
  const managed = peers.filter((p) => p.managed_key != null);
  const snapshot: MetricSnapshot = {
    ts,
    session_pct: usage?.session?.utilization ?? null,
    session_resets_at: usage?.session?.resetsAt ?? null,
    weekly_pct: usage?.weekly?.utilization ?? null,
    weekly_resets_at: usage?.weekly?.resetsAt ?? null,
    peers_running: peers.length,
    peers_open: managed.length,
    peers_busy: peers.filter((p) => p.busy === 1).length,
    conversations_open: convs.open,
    conversations_running: convs.running,
    rss_bytes: rss,
  };
  const peerRows: MetricPeerRow[] = managed.map((p) => ({
    peer_name: p.peer_name,
    managed_key: p.managed_key as string,
    cwd: p.cwd,
    busy: p.busy === 1 ? 1 : 0,
  }));
  return { snapshot, peers: peerRows };
}

export function initSchema(db: DatabaseT.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      session_pct REAL,
      session_resets_at TEXT,
      weekly_pct REAL,
      weekly_resets_at TEXT,
      peers_running INTEGER NOT NULL,
      peers_open INTEGER NOT NULL,
      peers_busy INTEGER NOT NULL,
      conversations_open INTEGER NOT NULL,
      conversations_running INTEGER NOT NULL,
      rss_bytes INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metric_peer (
      snapshot_id INTEGER NOT NULL REFERENCES metric_snapshot(id) ON DELETE CASCADE,
      peer_name TEXT,
      managed_key TEXT NOT NULL,
      cwd TEXT,
      busy INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metric_snapshot_ts ON metric_snapshot(ts);
    CREATE INDEX IF NOT EXISTS idx_metric_peer_snapshot ON metric_peer(snapshot_id);
  `);
}

/** Write one snapshot + its peer rows atomically. Returns the new snapshot id. */
export function persist(db: DatabaseT.Database, snapshot: MetricSnapshot, peers: MetricPeerRow[]): number {
  const insertSnapshot = db.prepare(
    `INSERT INTO metric_snapshot
       (ts, session_pct, session_resets_at, weekly_pct, weekly_resets_at,
        peers_running, peers_open, peers_busy, conversations_open, conversations_running, rss_bytes)
     VALUES (@ts, @session_pct, @session_resets_at, @weekly_pct, @weekly_resets_at,
        @peers_running, @peers_open, @peers_busy, @conversations_open, @conversations_running, @rss_bytes)`
  );
  const insertPeer = db.prepare(
    `INSERT INTO metric_peer (snapshot_id, peer_name, managed_key, cwd, busy)
     VALUES (?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((): number => {
    const id = Number(insertSnapshot.run(snapshot).lastInsertRowid);
    for (const p of peers) insertPeer.run(id, p.peer_name, p.managed_key, p.cwd, p.busy);
    return id;
  });
  return tx();
}

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

async function convCounts(): Promise<ConvCounts> {
  const port = (globalThis as typeof globalThis & { __backendPort?: number }).__backendPort;
  if (!port) return { open: 0, running: 0 };
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/conversations?limit=200`);
    if (!res.ok) return { open: 0, running: 0 };
    // aioncore envelopes lists as { data: { items } }; status may be absent on older
    // rows → those count as open-but-not-running (running filter just misses them).
    const body = (await res.json()) as { data?: { items?: Array<{ status?: string }> } };
    const items = body.data?.items ?? [];
    return { open: items.length, running: items.filter((c) => c.status === 'running').length };
  } catch {
    return { open: 0, running: 0 };
  }
}

let db: DatabaseT.Database | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  if (!db) return;
  try {
    const [usage, peers] = await Promise.all([fetchPlanUsage().catch((): PlanUsage | null => null), listPeers()]);
    const convs = await convCounts();
    const { snapshot, peers: peerRows } = assembleSnapshot({
      ts: Date.now(),
      usage,
      peers,
      convs,
      rss: process.memoryUsage().rss,
    });
    persist(db, snapshot, peerRows);
  } catch (error) {
    console.warn('[AionUi] metrics tick failed:', error);
  }
}

/** Open the db and start the 5-minute recorder. Safe to call once after backend ready. */
export function startMetricsRecorder(): void {
  if (timer) return;
  try {
    db = new BetterSqlite3(join(app.getPath('userData'), 'metrics.db'));
    db.pragma('journal_mode = WAL');
    initSchema(db);
  } catch (error) {
    console.error('[AionUi] metrics recorder db open failed:', error);
    db = null;
    return;
  }
  void tick(); // record one snapshot immediately, don't wait 5 min for the first
  timer = setInterval(() => void tick(), INTERVAL_MS);
  console.info('[AionUi] metrics recorder started');
}

export function stopMetricsRecorder(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (db) {
    db.close();
    db = null;
  }
}
