/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatTokenCount } from '@/renderer/components/agent/ContextUsageIndicator';
import { useContextUsage } from '@/renderer/hooks/agent/useContextUsage';
import React from 'react';

type ContextUsageBarProps = {
  conversation_id?: string;
  className?: string;
};

/**
 * Slim context-window bar (no heading) under the chat input — the single place the
 * context-window usage is shown. ~1/3 width, right-aligned to the chat box.
 */
const ContextUsageBar: React.FC<ContextUsageBarProps> = ({ conversation_id, className = '' }) => {
  const usage = useContextUsage(conversation_id);
  if (!usage) return null;

  const pct = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const barColor = pct > 90 ? 'rgb(var(--danger-6))' : pct > 70 ? 'rgb(var(--warning-6))' : 'rgb(var(--primary-6))';

  return (
    <div className={`flex items-center gap-8px w-1/3 ml-auto px-4px mt-8px ${className}`}>
      <div className='h-3px flex-1 rd-999px bg-fill-3 overflow-hidden'>
        <div className='h-full rd-999px transition-all' style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className='text-11px text-t-tertiary tabular-nums shrink-0'>
        {formatTokenCount(usage.used)} / {formatTokenCount(usage.limit, true)} ({Math.round(pct)}%)
      </span>
    </div>
  );
};

export default ContextUsageBar;
