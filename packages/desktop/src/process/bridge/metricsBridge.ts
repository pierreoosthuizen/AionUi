/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Metrics history bridge — surfaces snapshots from the metrics.db written by
 * metricsRecorder.ts so the renderer can render the metrics panel charts.
 *
 * Opens metrics.db READ-ONLY. On a fresh install the recorder may not have
 * created the file yet, so we open lazily and retry on each call until the
 * file appears. A failed open never propagates — we just return [].
 *
 * Query returns only the columns the chart-shaping layer needs; the full
 * metric_snapshot row also has rss_bytes, conversations_open, etc. that we
 * intentionally omit to keep the IPC payload small.
 */

import BetterSqlite3 from 'better-sqlite3';
import type DatabaseT from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import { ipcBridge } from '@/common';
import type { MetricHistoryRow } from '@/common/types/metricsPanel';

/** Cached READ-ONLY db handle; null = file not yet available or open failed. */
let db: DatabaseT.Database | null = null;

const DB_COLS = `ts, session_pct, session_resets_at, weekly_pct, weekly_resets_at, peers_open, peers_busy`;
const QUERY_SQL = `SELECT ${DB_COLS} FROM metric_snapshot WHERE ts >= ? ORDER BY ts ASC`;

/**
 * Return a read-only handle to metrics.db, opening it on first call.
 * Returns null when the file does not exist yet (recorder not started).
 * Caches a successful handle so repeated calls pay no open cost.
 */
function getDb(): DatabaseT.Database | null {
  if (db !== null) return db;
  try {
    db = new BetterSqlite3(join(app.getPath('userData'), 'metrics.db'), {
      readonly: true,
      fileMustExist: true,
    });
    return db;
  } catch {
    // File not yet created by the recorder — will retry on next call.
    return null;
  }
}

/**
 * Fetch metric snapshot rows with ts >= sinceMs, ascending.
 * Returns [] when the db does not exist yet or any query error occurs.
 */
function fetchHistory(sinceMs: number): MetricHistoryRow[] {
  try {
    const handle = getDb();
    if (handle === null) return [];
    const stmt = handle.prepare<[number], MetricHistoryRow>(QUERY_SQL);
    return stmt.all(sinceMs);
  } catch (err) {
    console.warn('[AionUi] metricsBridge: query failed', err);
    // If the db was corrupted or the recorder replaced it, reset the handle so
    // we re-open on the next call rather than staying stuck on a bad handle.
    db = null;
    return [];
  }
}

/** Register the `metrics:get-history` IPC provider. Call once after app ready. */
export function initMetricsBridge(): void {
  ipcBridge.metrics.getHistory.provider(({ sinceMs }) => Promise.resolve(fetchHistory(sinceMs)));
}
