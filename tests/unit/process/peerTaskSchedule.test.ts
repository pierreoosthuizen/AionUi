/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { computeNextRun, decideFire, FIRE_TOLERANCE_MS } from '@process/services/peerTaskSchedule';

// All times constructed via `new Date(y, m, d, h, ...)` = local time, matching the
// scheduler's local-time arithmetic. 2026-06-22 is a Monday.
const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo, d, h, mi, 0, 0).getTime();

describe('computeNextRun', () => {
  /** manual tasks never auto-fire. */
  it('returns undefined for manual frequency', () => {
    expect(computeNextRun({ frequency: 'manual' }, at(2026, 5, 22, 10, 0))).toBeUndefined();
  });

  /** hourly snaps to the top of the next hour. */
  it('rolls hourly to the next top-of-hour', () => {
    expect(computeNextRun({ frequency: 'hourly' }, at(2026, 5, 22, 10, 37))).toBe(at(2026, 5, 22, 11, 0));
  });

  /** daily picks today's slot when it is still ahead. */
  it('keeps daily slot later the same day', () => {
    expect(computeNextRun({ frequency: 'daily', time: '14:30' }, at(2026, 5, 22, 9, 0))).toBe(at(2026, 5, 22, 14, 30));
  });

  /** daily rolls to tomorrow once today's slot has passed. */
  it('rolls daily to tomorrow after the slot passed', () => {
    expect(computeNextRun({ frequency: 'daily', time: '09:00' }, at(2026, 5, 22, 9, 30))).toBe(at(2026, 5, 23, 9, 0));
  });

  /** weekdays skips Saturday/Sunday. */
  it('skips the weekend for weekdays frequency', () => {
    // Fri 2026-06-26 10:00 → next weekday slot is Mon 2026-06-29 08:00
    expect(computeNextRun({ frequency: 'weekdays', time: '08:00' }, at(2026, 5, 26, 10, 0))).toBe(at(2026, 5, 29, 8, 0));
  });

  /** weekly lands on the configured weekday. */
  it('lands weekly on the target weekday', () => {
    // From Mon 2026-06-22, next WED at 07:15 is 2026-06-24
    expect(computeNextRun({ frequency: 'weekly', weekday: 'WED', time: '07:15' }, at(2026, 5, 22, 12, 0))).toBe(at(2026, 5, 24, 7, 15));
  });
});

describe('decideFire', () => {
  const base = { enabled: true, frequency: 'daily' as const };

  /** a slot due within tolerance fires. */
  it('fires when due within tolerance', () => {
    expect(decideFire({ ...base, next_run_at_ms: 1000 }, 1000 + FIRE_TOLERANCE_MS - 1)).toBe('fire');
  });

  /** a slot overdue beyond tolerance (slept past) rolls forward, never fires. */
  it('rolls forward when overdue beyond tolerance', () => {
    expect(decideFire({ ...base, next_run_at_ms: 1000 }, 1000 + FIRE_TOLERANCE_MS + 1)).toBe('rollforward');
  });

  /** a future slot is idle. */
  it('is idle before the slot', () => {
    expect(decideFire({ ...base, next_run_at_ms: 5000 }, 1000)).toBe('idle');
  });

  /** disabled and manual tasks are always idle. */
  it('is idle when disabled or manual', () => {
    expect(decideFire({ enabled: false, frequency: 'daily', next_run_at_ms: 1 }, 1000)).toBe('idle');
    expect(decideFire({ enabled: true, frequency: 'manual', next_run_at_ms: 1 }, 1000)).toBe('idle');
  });
});
