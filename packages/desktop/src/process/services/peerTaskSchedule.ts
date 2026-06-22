/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer-task schedule math — pure, no IO (unit-tested).
 *
 * Peer-targeted tasks use a fixed frequency enum (no cron expressions, ADR-0002
 * §5), so next-run is plain local-time `Date` arithmetic. The scheduler scans on
 * a coarse interval and asks decideFire() what to do with each due task.
 */

import type { IPeerTask, PeerFrequency } from '@/common/adapter/ipcBridge';

/** A due task only fires if its slot is within this window of now; older = slept past it. */
export const FIRE_TOLERANCE_MS = 90_000;

const DOW: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

/**
 * Next fire time (epoch ms) at or after `fromMs`, in local time.
 * `manual` never auto-fires → undefined. `time` defaults to 09:00; `weekday` to MON.
 */
export function computeNextRun(task: Pick<IPeerTask, 'frequency' | 'time' | 'weekday'>, fromMs: number): number | undefined {
  const { frequency } = task;
  if (frequency === 'manual') return undefined;

  if (frequency === 'hourly') {
    const d = new Date(fromMs);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.getTime();
  }

  const [hh, mm] = (task.time ?? '09:00').split(':').map(Number);
  const at = new Date(fromMs);
  at.setHours(hh, mm, 0, 0);
  const target = DOW[task.weekday ?? 'MON'] ?? 1;
  const isWeekday = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5;

  // Walk forward at most a week to find the first slot strictly after `fromMs`
  // that also satisfies the day constraint.
  for (let i = 0; i < 8; i++) {
    if (at.getTime() > fromMs) {
      if (frequency === 'daily') return at.getTime();
      if (frequency === 'weekdays' && isWeekday(at)) return at.getTime();
      if (frequency === 'weekly' && at.getDay() === target) return at.getTime();
    }
    at.setDate(at.getDate() + 1);
  }
  return undefined; // unreachable for valid inputs
}

/**
 * What the scan loop should do with a task right now:
 * - `fire`        — due within tolerance → send the prompt.
 * - `rollforward` — overdue beyond tolerance (app slept past the slot) → advance
 *                   next_run WITHOUT firing (ADR-0002 §3, no stale catch-up).
 * - `idle`        — disabled, manual, or not yet due.
 */
export function decideFire(task: Pick<IPeerTask, 'enabled' | 'frequency' | 'next_run_at_ms'>, nowMs: number): 'fire' | 'rollforward' | 'idle' {
  if (!task.enabled || task.frequency === 'manual' || task.next_run_at_ms == null) return 'idle';
  if (task.next_run_at_ms > nowMs) return 'idle';
  return nowMs - task.next_run_at_ms <= FIRE_TOLERANCE_MS ? 'fire' : 'rollforward';
}
