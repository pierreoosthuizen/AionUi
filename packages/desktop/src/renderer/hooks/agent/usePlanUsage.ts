/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import type { PlanUsage } from '@/common/adapter/ipcBridge';

/**
 * Anthropic plan usage (5-hour session + 7-day weekly), polled from the main
 * process. Returns null when unavailable (no token / offline / endpoint change),
 * so the UI can simply hide. Windows change slowly — poll every 2 min; the main
 * bridge caches for 60s so this never hammers the keychain/endpoint.
 */
export function usePlanUsage(): PlanUsage | null {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = () =>
      ipcBridge.usage.getPlanUsage
        .invoke()
        .then((u) => {
          if (alive) setUsage(u);
        })
        .catch(() => {
          if (alive) setUsage(null);
        });
    void pull();
    const id = setInterval(pull, 120_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return usage;
}
