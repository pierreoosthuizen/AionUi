/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChartSeries, MetricsHistory } from '@/common/types/metricsPanel';
import { emptySeries } from '@/common/types/metricsPanel';

// ---------------------------------------------------------------------------
// TODO(reviewer): Remove this entire file once the data branch merges.
//   Replace usages of MOCK_METRICS_HISTORY in AcpChat.tsx with:
//     const metricsHistory = useMetricsHistory(metricsOpen);
//   Import useMetricsHistory from wherever Junior A places it.
// ---------------------------------------------------------------------------

const NOW = Date.now();

/** Build a pct series covering `durationMs` with `slotCount` slots, filling
 *  `filledCount` slots with ascending sample values from `startPct`. */
function makePctSeries(durationMs: number, slotCount: number, filledCount: number, startPct: number): ChartSeries {
  const windowStart = NOW - durationMs;
  const slotMs = durationMs / slotCount;
  const base = emptySeries(windowStart, NOW, 'pct');
  const bars = Array.from({ length: slotCount }, (_, i) => {
    const ts = windowStart + i * slotMs;
    if (i >= filledCount) return { ts, value: null };
    const pct = Math.min(100, startPct + (i / Math.max(1, filledCount - 1)) * (100 - startPct));
    return { ts, value: Math.round(pct) };
  });
  return { ...base, bars };
}

/** Build a count series covering `durationMs` with `slotCount` slots, filling
 *  `filledCount` slots with values up to `peakCount`. */
function makeCountSeries(durationMs: number, slotCount: number, filledCount: number, peakCount: number): ChartSeries {
  const windowStart = NOW - durationMs;
  const slotMs = durationMs / slotCount;
  const base = emptySeries(windowStart, NOW, 'count');
  const bars = Array.from({ length: slotCount }, (_, i) => {
    const ts = windowStart + i * slotMs;
    if (i >= filledCount) return { ts, value: null };
    const v = Math.max(1, Math.round((i / Math.max(1, filledCount - 1)) * peakCount));
    return { ts, value: v };
  });
  return { ...base, bars, max: Math.max(1, peakCount) };
}

const H5 = 5 * 60 * 60 * 1000; // 5 hours in ms
const D7 = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Static mock for the MetricsHistory shape.
 * Usage tab: sessionUsage (5h, 60 slots) | weeklyUsage (7d, 84 slots)
 * Peers tab: openPeersWeek (7d, 84 slots) | activePeers5min (5h, 60 slots)
 */
export const MOCK_METRICS_HISTORY: MetricsHistory = {
  sessionUsage: makePctSeries(H5, 60, 38, 10),
  weeklyUsage: makePctSeries(D7, 84, 52, 5),
  openPeersWeek: makeCountSeries(D7, 84, 52, 4),
  activePeers5min: makeCountSeries(H5, 60, 38, 2),
  loading: false,
};
