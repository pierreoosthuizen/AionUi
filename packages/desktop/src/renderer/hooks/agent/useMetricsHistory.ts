/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { ipcBridge } from '@/common';
import type { MetricsHistory } from '@/common/types/metricsPanel';
import { emptySeries } from '@/common/types/metricsPanel';
import {
  shapeActivePeers5min,
  shapeOpenPeersWeek,
  shapeSessionUsage,
  shapeWeeklyUsage,
} from '@renderer/utils/metricsShaping';

const POLL_INTERVAL_MS = 60_000;
const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60_000; // 7 days — covers the longest series

/** Stable empty MetricsHistory returned when the panel is hidden (enabled=false). */
function makeEmptyHistory(): MetricsHistory {
  const now = Date.now();
  const ms5h = 5 * 60 * 60_000;
  const ms7d = 7 * 24 * 60 * 60_000;
  return {
    sessionUsage: emptySeries(now - ms5h, now, 'pct'),
    weeklyUsage: emptySeries(now - ms7d, now, 'pct'),
    openPeersWeek: emptySeries(now - ms7d, now, 'count'),
    activePeers5min: emptySeries(now - ms5h, now, 'count'),
    loading: false,
  };
}

/**
 * Fetch and poll metrics history from the main process, shaping rows into
 * four chart series for the metrics panel.
 *
 * When `enabled` is false (panel hidden) no IPC calls are made and a stable
 * empty MetricsHistory is returned so the panel can unmount safely.
 * When `enabled` is true, rows are fetched immediately on mount and every
 * 60 seconds thereafter. The interval and any in-flight promises are cleaned
 * up when `enabled` flips back to false or the component unmounts.
 */
export function useMetricsHistory(enabled: boolean): MetricsHistory {
  // Use a ref for the stable empty value so it never changes identity.
  const emptyRef = useRef<MetricsHistory>(makeEmptyHistory());
  const [history, setHistory] = useState<MetricsHistory>(emptyRef.current);

  useEffect(() => {
    if (!enabled) {
      setHistory(emptyRef.current);
      return;
    }

    let alive = true;

    const pull = (): void => {
      const sinceMs = Date.now() - HISTORY_WINDOW_MS;
      ipcBridge.metrics.getHistory
        .invoke({ sinceMs })
        .then((rows) => {
          if (!alive) return;
          const nowMs = Date.now();
          setHistory({
            sessionUsage: shapeSessionUsage(rows, nowMs),
            weeklyUsage: shapeWeeklyUsage(rows, nowMs),
            openPeersWeek: shapeOpenPeersWeek(rows, nowMs),
            activePeers5min: shapeActivePeers5min(rows, nowMs),
            loading: false,
          });
        })
        .catch(() => {
          // IPC failure — keep previous state; panel will show stale data.
        });
    };

    // Mark loading immediately so the panel can show a spinner on first open.
    setHistory((prev) => ({ ...prev, loading: true }));
    pull();
    const id = setInterval(pull, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled]);

  return history;
}
