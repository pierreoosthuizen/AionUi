/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlanUsageWindow } from '@/common/adapter/ipcBridge';
import { usePlanUsage } from '@renderer/hooks/agent/usePlanUsage';
import React from 'react';
import { useTranslation } from 'react-i18next';

/** "in 2h 42m" / "in 42m" / "now" — relative reset for the 5-hour session. */
export function formatResetIn(resetsAt: string, now: number): string {
  const ms = new Date(resetsAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return 'now';
  const mins = Math.round(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

/** "Thu 8:59 PM" — absolute reset for the 7-day weekly window. */
export function formatResetAt(resetsAt: string): string {
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const barColor = (pct: number): string =>
  pct > 90 ? 'rgb(var(--danger-6))' : pct > 70 ? 'rgb(var(--warning-6))' : 'rgb(var(--primary-6))';

const UsageRow: React.FC<{ label: string; win: PlanUsageWindow; reset: string }> = ({ label, win, reset }) => {
  const pct = Math.min(100, Math.max(0, win.utilization));
  return (
    <div className='flex flex-col gap-2px'>
      <div className='flex items-center justify-between text-11px'>
        <span className='text-t-secondary'>{label}</span>
        <span className='text-t-tertiary tabular-nums'>{Math.round(pct)}%</span>
      </div>
      <div className='h-3px rd-999px bg-fill-3 overflow-hidden'>
        <div className='h-full rd-999px transition-all' style={{ width: `${pct}%`, background: barColor(pct) }} />
      </div>
      {reset && <div className='text-10px text-t-tertiary leading-none'>{reset}</div>}
    </div>
  );
};

/**
 * Anthropic plan usage (5-hour session + 7-day weekly) at the bottom of the
 * sidebar — the same data Claude Desktop shows in settings, surfaced without
 * opening settings. Hidden when the sidebar is collapsed or data is unavailable.
 */
const PlanUsageBars: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const usage = usePlanUsage();
  if (collapsed || !usage || (!usage.session && !usage.weekly)) return null;

  const now = Date.now();
  return (
    <div className='flex flex-col gap-8px px-12px pb-8px pt-2px'>
      {usage.session && (
        <UsageRow
          label={t('settings.planUsage.session', { defaultValue: 'Session' })}
          win={usage.session}
          reset={
            usage.session.resetsAt
              ? t('settings.planUsage.resets', {
                  defaultValue: 'Resets {{when}}',
                  when: formatResetIn(usage.session.resetsAt, now),
                })
              : ''
          }
        />
      )}
      {usage.weekly && (
        <UsageRow
          label={t('settings.planUsage.weekly', { defaultValue: 'Weekly' })}
          win={usage.weekly}
          reset={
            usage.weekly.resetsAt
              ? t('settings.planUsage.resets', {
                  defaultValue: 'Resets {{when}}',
                  when: formatResetAt(usage.weekly.resetsAt),
                })
              : ''
          }
        />
      )}
    </div>
  );
};

export default PlanUsageBars;
