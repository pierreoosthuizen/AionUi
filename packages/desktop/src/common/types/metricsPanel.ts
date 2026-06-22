/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LOCKED SHARED CONTRACT — metrics panel feature.
 *
 * This file is the parallelization seam between the two builders:
 *   - Junior A (data/process) implements `metrics.getHistory` + the shaping utils
 *     + the `useMetricsHistory` hook, all producing the types below.
 *   - Junior B (UI) consumes `ChartSeries` / `MetricsHistory` to render charts,
 *     mocking the hook against these types until A lands.
 *
 * NEITHER builder edits this file without syncing with the reviewer (agora).
 * Drift here = the two worktrees collide on merge. Keep it stable.
 */

/**
 * One raw snapshot row returned by the `metrics:get-history` IPC — the subset of
 * the `metric_snapshot` table the charts actually need. Mirrors columns written by
 * metricsRecorder.ts. `*_pct` / `*_resets_at` are null when plan usage was
 * unavailable at capture time.
 */
export type MetricHistoryRow = {
  /** epoch ms (metric_snapshot.ts) */
  ts: number;
  session_pct: number | null;
  session_resets_at: string | null;
  weekly_pct: number | null;
  weekly_resets_at: string | null;
  /** managed (chat-backed) peers open at snapshot time */
  peers_open: number;
  /** peers with busy=1 at snapshot time */
  peers_busy: number;
};

/** Args for the history query IPC. Returns rows with ts >= sinceMs, ascending. */
export type MetricHistoryQuery = { sinceMs: number };

/**
 * One bar in a chart. `value === null` means "no snapshot covered this slot" —
 * the renderer draws a faint empty track segment there (the "full length of the
 * period, populated only as far as it is populated" requirement).
 */
export type ChartBar = { ts: number; value: number | null };

/**
 * A fully-shaped chart series ready to render. The bars array always spans the
 * WHOLE window (windowStartMs..windowEndMs) at a fixed slot size; slots beyond
 * "now" (or with no snapshot) carry value=null so the axis shows full length.
 */
export type ChartSeries = {
  bars: ChartBar[];
  windowStartMs: number;
  windowEndMs: number;
  /** axis max — 100 for 'pct' series, dynamic (>=1) for 'count' series */
  max: number;
  unit: 'pct' | 'count';
};

/**
 * The four shaped series the panel renders, plus load state. Returned by
 * `useMetricsHistory(enabled)`. `enabled` gates polling — false (panel hidden)
 * → no IPC traffic; true (panel open) → poll on-open + while-open.
 *
 *  Usage tab:  sessionUsage (5h window) | weeklyUsage (7d window)
 *  Peers tab:  openPeersWeek (7d window) | activePeers5min (5h window)
 */
export type MetricsHistory = {
  sessionUsage: ChartSeries;
  weeklyUsage: ChartSeries;
  openPeersWeek: ChartSeries;
  activePeers5min: ChartSeries;
  loading: boolean;
};

/** An empty series for a given window — used as hook initial state / mock seed. */
export const emptySeries = (windowStartMs: number, windowEndMs: number, unit: ChartSeries['unit']): ChartSeries => ({
  bars: [],
  windowStartMs,
  windowEndMs,
  max: unit === 'pct' ? 100 : 1,
  unit,
});
