import { describe, expect, it } from 'vitest';
import { formatResetIn } from '@/renderer/components/layout/Sider/PlanUsageBars';

describe('formatResetIn', () => {
  const now = Date.UTC(2026, 5, 22, 13, 0, 0); // 2026-06-22T13:00:00Z

  it('formats hours + minutes', () => {
    expect(formatResetIn('2026-06-22T15:42:00Z', now)).toBe('in 2h 42m');
  });

  it('formats minutes only under an hour', () => {
    expect(formatResetIn('2026-06-22T13:42:00Z', now)).toBe('in 42m');
  });

  it('returns "now" for past/invalid resets', () => {
    expect(formatResetIn('2026-06-22T12:00:00Z', now)).toBe('now');
    expect(formatResetIn('garbage', now)).toBe('now');
  });
});
