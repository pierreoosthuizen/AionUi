/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  shapeSessionUsage,
  shapeWeeklyUsage,
  shapeOpenPeersWeek,
  shapeActivePeers5min,
} from '@renderer/utils/metricsShaping';
import type { MetricHistoryRow } from '@/common/types/metricsPanel';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MS_5MIN = 5 * 60_000;
const MS_1HOUR = 60 * 60_000;
const MS_5HOURS = 5 * MS_1HOUR;
const MS_7DAYS = 7 * 24 * MS_1HOUR;

const SLOT_COUNT_5H = MS_5HOURS / MS_5MIN; // 60
const SLOT_COUNT_7D = MS_7DAYS / MS_1HOUR; // 168

/** Build a minimal MetricHistoryRow with defaults for unused columns. */
function row(overrides: Partial<MetricHistoryRow> & { ts: number }): MetricHistoryRow {
  return {
    ts: overrides.ts,
    session_pct: overrides.session_pct ?? null,
    session_resets_at: overrides.session_resets_at ?? null,
    weekly_pct: overrides.weekly_pct ?? null,
    weekly_resets_at: overrides.weekly_resets_at ?? null,
    peers_open: overrides.peers_open ?? 0,
    peers_busy: overrides.peers_busy ?? 0,
  };
}

// A fixed "now" so tests are deterministic.
const NOW = 1_700_000_000_000; // 2023-11-14T22:13:20.000Z

// ---------------------------------------------------------------------------
// shapeSessionUsage
// ---------------------------------------------------------------------------

describe('shapeSessionUsage', () => {
  it('returns 60 bars all-null when rows is empty', () => {
    /** Verifies that an empty row set produces the correct slot count and all null values. */
    const series = shapeSessionUsage([], NOW);
    expect(series.bars).toHaveLength(SLOT_COUNT_5H);
    expect(series.bars.every((b) => b.value === null)).toBe(true);
    expect(series.unit).toBe('pct');
    expect(series.max).toBe(100);
  });

  it('sets window to [nowMs-5h, nowMs] when no session_resets_at is present', () => {
    /** Verifies the fallback window [nowMs-5h, nowMs] is used when no resets_at is available. */
    const series = shapeSessionUsage([], NOW);
    expect(series.windowStartMs).toBe(NOW - MS_5HOURS);
    expect(series.windowEndMs).toBe(NOW);
  });

  it('uses resets_at-driven window when latest row has session_resets_at', () => {
    /** Verifies that session_resets_at shifts the window to [resetsAt-5h, resetsAt]. */
    const resetsAt = new Date(NOW - MS_1HOUR).toISOString(); // 1h before now
    const r = row({ ts: NOW - 2 * MS_5MIN, session_pct: 42, session_resets_at: resetsAt });
    const series = shapeSessionUsage([r], NOW);
    const expectedEnd = Date.parse(resetsAt);
    expect(series.windowEndMs).toBe(expectedEnd);
    expect(series.windowStartMs).toBe(expectedEnd - MS_5HOURS);
  });

  it('fills exactly one bar for a single row near the start of the window', () => {
    /**
     * Verifies that a single row placed in the first slot produces one filled bar
     * and all subsequent bars remain null.
     */
    const windowStart = NOW - MS_5HOURS;
    // Place the row 1 minute into the window (inside slot 0).
    const r = row({ ts: windowStart + 60_000, session_pct: 55 });
    const series = shapeSessionUsage([r], NOW);
    expect(series.bars[0].value).toBe(55);
    expect(series.bars.slice(1).every((b) => b.value === null)).toBe(true);
  });

  it('last row in a slot wins when multiple rows land in the same slot', () => {
    /** Verifies that when two rows share a slot, the later ts value is used. */
    const windowStart = NOW - MS_5HOURS;
    const r1 = row({ ts: windowStart + 60_000, session_pct: 10 });
    const r2 = row({ ts: windowStart + 2 * 60_000, session_pct: 20 });
    const series = shapeSessionUsage([r1, r2], NOW);
    expect(series.bars[0].value).toBe(20);
  });

  it('null session_pct rows produce null bars', () => {
    /** Verifies that rows where session_pct is null do not fill their slot. */
    const windowStart = NOW - MS_5HOURS;
    const r = row({ ts: windowStart + 60_000, session_pct: null });
    const series = shapeSessionUsage([r], NOW);
    expect(series.bars[0].value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shapeWeeklyUsage
// ---------------------------------------------------------------------------

describe('shapeWeeklyUsage', () => {
  it('returns 168 bars all-null when rows is empty', () => {
    /** Verifies that an empty row set produces the correct 168-slot count and all null values. */
    const series = shapeWeeklyUsage([], NOW);
    expect(series.bars).toHaveLength(SLOT_COUNT_7D);
    expect(series.bars.every((b) => b.value === null)).toBe(true);
    expect(series.unit).toBe('pct');
    expect(series.max).toBe(100);
  });

  it('sets window to [nowMs-7d, nowMs] when no weekly_resets_at is present', () => {
    /** Verifies the fallback [nowMs-7d, nowMs] window when no weekly reset date exists. */
    const series = shapeWeeklyUsage([], NOW);
    expect(series.windowStartMs).toBe(NOW - MS_7DAYS);
    expect(series.windowEndMs).toBe(NOW);
  });

  it('uses weekly_resets_at-driven window when present', () => {
    /** Verifies that weekly_resets_at shifts the window to [resetsAt-7d, resetsAt]. */
    const resetsAt = new Date(NOW - MS_1HOUR).toISOString();
    const r = row({ ts: NOW - 2 * MS_1HOUR, weekly_pct: 75, weekly_resets_at: resetsAt });
    const series = shapeWeeklyUsage([r], NOW);
    const expectedEnd = Date.parse(resetsAt);
    expect(series.windowEndMs).toBe(expectedEnd);
    expect(series.windowStartMs).toBe(expectedEnd - MS_7DAYS);
  });

  it('fills exactly one bar for a single row near the start of the 7d window', () => {
    /**
     * Verifies that a single row near the window start fills slot 0 and leaves
     * all other bars null.
     */
    const windowStart = NOW - MS_7DAYS;
    const r = row({ ts: windowStart + 60_000, weekly_pct: 30 });
    const series = shapeWeeklyUsage([r], NOW);
    expect(series.bars[0].value).toBe(30);
    expect(series.bars.slice(1).every((b) => b.value === null)).toBe(true);
  });

  it('null weekly_pct rows produce null bars', () => {
    /** Verifies that rows where weekly_pct is null do not fill their slot. */
    const windowStart = NOW - MS_7DAYS;
    const r = row({ ts: windowStart + 60_000, weekly_pct: null });
    const series = shapeWeeklyUsage([r], NOW);
    expect(series.bars[0].value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shapeOpenPeersWeek
// ---------------------------------------------------------------------------

describe('shapeOpenPeersWeek', () => {
  it('returns 168 bars all-null and max=1 when rows is empty', () => {
    /** Verifies empty rows produce 168 null bars and a safe minimum max of 1. */
    const series = shapeOpenPeersWeek([], NOW);
    expect(series.bars).toHaveLength(SLOT_COUNT_7D);
    expect(series.bars.every((b) => b.value === null)).toBe(true);
    expect(series.max).toBe(1);
    expect(series.unit).toBe('count');
  });

  it('uses MAX peers_open across rows in the same slot', () => {
    /** Verifies that the maximum peers_open value in a slot is chosen, not the last. */
    const windowStart = NOW - MS_7DAYS;
    const r1 = row({ ts: windowStart + 60_000, peers_open: 3 });
    const r2 = row({ ts: windowStart + 2 * 60_000, peers_open: 7 });
    const r3 = row({ ts: windowStart + 3 * 60_000, peers_open: 2 });
    const series = shapeOpenPeersWeek([r1, r2, r3], NOW);
    expect(series.bars[0].value).toBe(7);
  });

  it('computes axis max from observed data (max >= 1)', () => {
    /** Verifies that axis max equals the observed maximum and is never below 1. */
    const windowStart = NOW - MS_7DAYS;
    const r = row({ ts: windowStart + MS_1HOUR + 60_000, peers_open: 5 });
    const series = shapeOpenPeersWeek([r], NOW);
    expect(series.max).toBe(5);
  });

  it('axis max is at least 1 even when all values are 0', () => {
    /** Verifies that a max of 0 is clamped to 1 to prevent a zero-height axis. */
    const windowStart = NOW - MS_7DAYS;
    const r = row({ ts: windowStart + 60_000, peers_open: 0 });
    const series = shapeOpenPeersWeek([r], NOW);
    expect(series.max).toBe(1);
  });

  it('window is always [nowMs-7d, nowMs] (not resets_at driven)', () => {
    /** Verifies open-peers-week always uses the fixed now-driven window, not a reset timestamp. */
    const series = shapeOpenPeersWeek([], NOW);
    expect(series.windowStartMs).toBe(NOW - MS_7DAYS);
    expect(series.windowEndMs).toBe(NOW);
  });
});

// ---------------------------------------------------------------------------
// shapeActivePeers5min
// ---------------------------------------------------------------------------

describe('shapeActivePeers5min', () => {
  it('returns 60 bars all-null and max=1 when rows is empty', () => {
    /** Verifies empty rows produce 60 null bars and a safe minimum max of 1. */
    const series = shapeActivePeers5min([], NOW);
    expect(series.bars).toHaveLength(SLOT_COUNT_5H);
    expect(series.bars.every((b) => b.value === null)).toBe(true);
    expect(series.max).toBe(1);
    expect(series.unit).toBe('count');
  });

  it('uses last peers_busy in slot (not max)', () => {
    /** Verifies that the last peers_busy value in a slot wins, not the maximum. */
    const windowStart = NOW - MS_5HOURS;
    const r1 = row({ ts: windowStart + 60_000, peers_busy: 4 });
    const r2 = row({ ts: windowStart + 2 * 60_000, peers_busy: 1 });
    const series = shapeActivePeers5min([r1, r2], NOW);
    expect(series.bars[0].value).toBe(1);
  });

  it('computes axis max from observed peers_busy values', () => {
    /** Verifies that axis max equals the maximum observed peers_busy across all bars. */
    const windowStart = NOW - MS_5HOURS;
    const r1 = row({ ts: windowStart + 60_000, peers_busy: 2 });
    const r2 = row({ ts: windowStart + MS_5MIN + 60_000, peers_busy: 6 });
    const series = shapeActivePeers5min([r1, r2], NOW);
    expect(series.max).toBe(6);
  });

  it('window is always [nowMs-5h, nowMs] (not resets_at driven)', () => {
    /** Verifies active-peers-5min always uses the fixed now-driven window. */
    const series = shapeActivePeers5min([], NOW);
    expect(series.windowStartMs).toBe(NOW - MS_5HOURS);
    expect(series.windowEndMs).toBe(NOW);
  });

  it('fills one bar for a single row near the window start, rest null', () => {
    /**
     * Verifies that a single early row fills exactly slot 0 and leaves all
     * subsequent bars null.
     */
    const windowStart = NOW - MS_5HOURS;
    const r = row({ ts: windowStart + 60_000, peers_busy: 3 });
    const series = shapeActivePeers5min([r], NOW);
    expect(series.bars[0].value).toBe(3);
    expect(series.bars.slice(1).every((b) => b.value === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: future slots are always null
// ---------------------------------------------------------------------------

describe('future slot handling', () => {
  it('shapeSessionUsage: bar starting after nowMs is null even if a row ts lands there', () => {
    /**
     * Verifies that slots starting at or after nowMs carry value=null regardless
     * of whether a row has a ts inside that slot (future data must not appear).
     */
    // Place a row exactly at nowMs - it would fall into the last 5-min slot.
    // But nowMs itself starts the next slot which is in the future.
    const series = shapeSessionUsage([], NOW);
    // The last bar starts at windowStart + 59*5min = NOW - 5min.
    const lastBar = series.bars[series.bars.length - 1];
    // It starts 5 min before nowMs, so it is NOT in the future.
    expect(lastBar.ts).toBe(NOW - MS_5MIN);
    // Its value is null because there are no rows.
    expect(lastBar.value).toBeNull();
  });
});
