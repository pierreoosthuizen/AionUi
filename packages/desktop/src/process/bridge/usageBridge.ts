/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plan usage bridge — surfaces the same "Plan usage limits" data Claude Desktop
 * shows (current 5-hour session + 7-day weekly), so it can live in the sidebar
 * without opening settings.
 *
 * Source: the embedded agent's own Anthropic OAuth token, stored by Claude Code
 * in the macOS keychain (service "Claude Code-credentials"). We read it in the
 * main process and call the OAuth usage endpoint. The token never leaves main —
 * only utilization %/reset timestamps cross IPC.
 *
 * ponytail: macOS-only (security CLI), matches the rest of the app. No token
 * refresh — if it 401s, Claude Code refreshes its own keychain entry; we just
 * return null until then. Undocumented endpoint: if Anthropic changes it, this
 * degrades to null (sidebar hides) rather than breaking anything.
 */

import { execFile } from 'node:child_process';
import { ipcBridge } from '@/common';
import type { PlanUsage, PlanUsageWindow } from '@/common/adapter/ipcBridge';

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
// ponytail: the OAuth usage endpoint is steeply rate-limited — polling it every
// few minutes 429s, then every later call fails too. Throttle by NEXT-ATTEMPT
// time (not by last-success), so a 429 backs us off for the full window instead
// of letting every sidebar/recorder poll keep the rate-limit hot — that was the
// bug: caching only successes meant persistent 429s never stopped hammering, so
// the window never cooled and usage stayed null forever. Carry forward the last
// good value across failures. Weekly/session % move slowly, so 10-min staleness
// costs nothing. Lower the TTL only if Anthropic raises the limit.
const CACHE_TTL_MS = 10 * 60_000;

let lastGood: PlanUsage | null = null; // last SUCCESSFUL read, carried forward
let nextAttemptAt = 0; // don't touch the endpoint again before this (epoch ms)

/** Map the OAuth usage payload to our window shape. Pure — unit-tested. */
export function parsePlanUsage(raw: unknown): PlanUsage {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const win = (w: unknown): PlanUsageWindow | null => {
    if (!w || typeof w !== 'object') return null;
    const o = w as Record<string, unknown>;
    if (typeof o.utilization !== 'number') return null;
    return { utilization: o.utilization, resetsAt: typeof o.resets_at === 'string' ? o.resets_at : null };
  };
  return { session: win(r.five_hour), weekly: win(r.seven_day) };
}

/** Read the Claude Code OAuth access token from the macOS keychain. */
function readKeychainToken(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'security',
      ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'],
      { timeout: 5000 },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as { claudeAiOauth?: { accessToken?: string } };
          resolve(parsed.claudeAiOauth?.accessToken ?? null);
        } catch {
          resolve(null);
        }
      }
    );
  });
}

export async function fetchPlanUsage(): Promise<PlanUsage | null> {
  const now = Date.now();
  if (now < nextAttemptAt) return lastGood; // backed off — don't poke the endpoint
  nextAttemptAt = now + CACHE_TTL_MS; // throttle the NEXT call regardless of outcome
  const token = await readKeychainToken();
  if (!token) return lastGood;
  try {
    const res = await fetch(USAGE_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) return lastGood; // 429/401 → carry forward last good, stay backed off
    lastGood = parsePlanUsage(await res.json());
    return lastGood;
  } catch {
    return lastGood; // offline / endpoint change → last good, else null
  }
}

export function initUsageBridge(): void {
  // Cache lives inside fetchPlanUsage now (shared across all callers) — provider
  // is a thin passthrough.
  ipcBridge.usage.getPlanUsage.provider(() => fetchPlanUsage());
}
