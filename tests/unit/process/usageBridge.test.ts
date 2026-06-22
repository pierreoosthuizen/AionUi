import { describe, expect, it } from 'vitest';
import { parsePlanUsage } from '@process/bridge/usageBridge';

describe('parsePlanUsage', () => {
  it('maps five_hour → session and seven_day → weekly', () => {
    const out = parsePlanUsage({
      five_hour: { utilization: 54, resets_at: '2026-06-22T15:49:59+00:00' },
      seven_day: { utilization: 39, resets_at: '2026-06-25T18:59:59+00:00' },
    });
    expect(out.session).toEqual({ utilization: 54, resetsAt: '2026-06-22T15:49:59+00:00' });
    expect(out.weekly).toEqual({ utilization: 39, resetsAt: '2026-06-25T18:59:59+00:00' });
  });

  it('keeps a window with utilization but missing reset (null resetsAt)', () => {
    expect(parsePlanUsage({ five_hour: { utilization: 0 } }).session).toEqual({ utilization: 0, resetsAt: null });
  });

  it('returns null windows for missing/invalid data', () => {
    expect(parsePlanUsage({})).toEqual({ session: null, weekly: null });
    expect(parsePlanUsage(null)).toEqual({ session: null, weekly: null });
    expect(parsePlanUsage({ five_hour: { resets_at: 'x' } }).session).toBeNull();
  });
});
