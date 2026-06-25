/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure chart-shaping utilities for the metrics panel.
 *
 * Each function takes a MetricHistoryRow[] (ascending ts) + nowMs and returns a
 * ChartSeries whose bars array spans the WHOLE window at a fixed slot width.
 * Slots with no snapshot — or slots in the future — carry value=null so the
 * renderer draws the "full length of the period, populated only as far as
 * elapsed" effect.
 *
 * All functions are pure (no side effects, no IPC). Unit tests live alongside.
 */

import type { ChartBar, ChartSeries, MetricHistoryRow } from '@/common/types/metricsPanel';
import { emptySeries } from '@/common/types/metricsPanel';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MS_5MIN = 5 * 60_000;
const MS_1HOUR = 60 * 60_000;
const MS_5HOURS = 5 * MS_1HOUR;
const MS_7DAYS = 7 * 24 * MS_1HOUR;

/**
 * Build a bar array spanning [windowStartMs, windowEndMs) in fixed slots.
 * For each slot, the reducer picks a value from the rows whose ts falls in
 * [slotStart, slotStart + slotMs). Slots in the future relative to nowMs
 * are clamped to null regardless of data.
 *
 * @param rows      - ascending-ts snapshot rows (may be empty)
 * @param windowStartMs - inclusive start of the window (epoch ms)
 * @param windowEndMs   - exclusive end / "now" of the window (epoch ms)
 * @param slotMs    - width of each bar in ms
 * @param nowMs     - current time; bars starting after this get value=null
 * @param pick      - reducer: given all rows in a slot, return number | null
 */
function buildBars(
  rows: MetricHistoryRow[],
  windowStartMs: number,
  windowEndMs: number,
  slotMs: number,
  nowMs: number,
  pick: (slotRows: MetricHistoryRow[]) => number | null
): ChartBar[] {
  const bars: ChartBar[] = [];
  let rowIdx = 0;
  const n = rows.length;

  for (let slotStart = windowStartMs; slotStart < windowEndMs; slotStart += slotMs) {
    // Bars that start after nowMs are always null (future).
    if (slotStart >= nowMs) {
      bars.push({ ts: slotStart, value: null });
      continue;
    }

    const slotEnd = slotStart + slotMs;
    // Advance past rows that are before this slot.
    while (rowIdx < n && rows[rowIdx].ts < slotStart) rowIdx++;

    const slotRows: MetricHistoryRow[] = [];
    let i = rowIdx;
    while (i < n && rows[i].ts < slotEnd) {
      slotRows.push(rows[i]);
      i++;
    }

    bars.push({ ts: slotStart, value: pick(slotRows) });
  }

  return bars;
}

/** Last non-null value in the slot for a nullable numeric field. */
function lastNonNull(slotRows: MetricHistoryRow[], field: keyof MetricHistoryRow): number | null {
  let result: number | null = null;
  for (const row of slotRows) {
    const v = row[field];
    if (typeof v === 'number') result = v;
  }
  return result;
}

/** Maximum numeric value across the slot, or null if slot is empty. */
function maxInSlot(slotRows: MetricHistoryRow[], field: keyof MetricHistoryRow): number | null {
  if (slotRows.length === 0) return null;
  let max = -Infinity;
  for (const row of slotRows) {
    const v = row[field];
    if (typeof v === 'number' && v > max) max = v;
  }
  return max === -Infinity ? null : max;
}

// ---------------------------------------------------------------------------
// Exported shaping functions
// ---------------------------------------------------------------------------

/**
 * Shape the 5-hour session usage series (60 × 5-min slots, unit: pct, max: 100).
 *
 * Window: if the latest row has a non-null session_resets_at, the window is
 * [resetsAt-5h, resetsAt]; otherwise [nowMs-5h, nowMs]. Value per slot is the
 * last session_pct in that slot.
 */
export function shapeSessionUsage(rows: MetricHistoryRow[], nowMs: number): ChartSeries {
  let windowEnd = nowMs;

  // Find the latest session_resets_at across all rows.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i].session_resets_at;
    if (r !== null) {
      const parsed = Date.parse(r);
      if (!Number.isNaN(parsed)) {
        windowEnd = parsed;
        break;
      }
    }
  }

  const windowStart = windowEnd - MS_5HOURS;
  const bars = buildBars(rows, windowStart, windowEnd, MS_5MIN, nowMs, (slotRows) =>
    lastNonNull(slotRows, 'session_pct')
  );

  return {
    bars,
    windowStartMs: windowStart,
    windowEndMs: windowEnd,
    max: 100,
    unit: 'pct',
  };
}

/**
 * Shape the 7-day weekly usage series (168 × 1-hour slots, unit: pct, max: 100).
 *
 * Window: if the latest row has a non-null weekly_resets_at, the window is
 * [resetsAt-7d, resetsAt]; otherwise [nowMs-7d, nowMs]. Value per slot is the
 * last weekly_pct in that slot.
 */
export function shapeWeeklyUsage(rows: MetricHistoryRow[], nowMs: number): ChartSeries {
  let windowEnd = nowMs;

  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i].weekly_resets_at;
    if (r !== null) {
      const parsed = Date.parse(r);
      if (!Number.isNaN(parsed)) {
        windowEnd = parsed;
        break;
      }
    }
  }

  const windowStart = windowEnd - MS_7DAYS;
  const bars = buildBars(rows, windowStart, windowEnd, MS_1HOUR, nowMs, (slotRows) =>
    lastNonNull(slotRows, 'weekly_pct')
  );

  return {
    bars,
    windowStartMs: windowStart,
    windowEndMs: windowEnd,
    max: 100,
    unit: 'pct',
  };
}

/**
 * Shape the 7-day open-peers series (168 × 1-hour slots, unit: count).
 *
 * Window: [nowMs-7d, nowMs]. Value per slot is the MAX peers_open in that slot.
 * Axis max is max(1, observed maximum across all bars).
 */
export function shapeOpenPeersWeek(rows: MetricHistoryRow[], nowMs: number): ChartSeries {
  const windowStart = nowMs - MS_7DAYS;
  const bars = buildBars(rows, windowStart, nowMs, MS_1HOUR, nowMs, (slotRows) => maxInSlot(slotRows, 'peers_open'));

  let observedMax = 0;
  for (const bar of bars) {
    if (bar.value !== null && bar.value > observedMax) observedMax = bar.value;
  }

  return {
    bars,
    windowStartMs: windowStart,
    windowEndMs: nowMs,
    max: Math.max(1, observedMax),
    unit: 'count',
  };
}

/**
 * Shape the 5-hour active-peers series (60 × 5-min slots, unit: count).
 *
 * Window: [nowMs-5h, nowMs]. Value per slot is the last peers_running (every live
 * peer the broker reported) in that slot — ISS-008: this used to read peers_busy,
 * which is ~always 0 because peers rarely self-mark busy, so the chart showed no
 * data. Axis max is max(1, observed maximum across all bars).
 */
export function shapeActivePeers5min(rows: MetricHistoryRow[], nowMs: number): ChartSeries {
  const windowStart = nowMs - MS_5HOURS;
  const bars = buildBars(rows, windowStart, nowMs, MS_5MIN, nowMs, (slotRows) =>
    lastNonNull(slotRows, 'peers_running')
  );

  let observedMax = 0;
  for (const bar of bars) {
    if (bar.value !== null && bar.value > observedMax) observedMax = bar.value;
  }

  return {
    bars,
    windowStartMs: windowStart,
    windowEndMs: nowMs,
    max: Math.max(1, observedMax),
    unit: 'count',
  };
}

// Re-export so the hook can construct the empty initial state from one import.
export { emptySeries };
