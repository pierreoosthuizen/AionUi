/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContextUsage } from '@/renderer/hooks/agent/useContextUsage';
import { formatTokenCount } from '@/renderer/components/agent/ContextUsageIndicator';
import type { TFunction } from 'i18next';
import React from 'react';

type ContextUsageFooterProps = {
  t: TFunction;
  conversation_id?: string;
};

/**
 * Bottom section of the Project panel: the conversation's context-window usage
 * (used / limit / %). Only the context window is shown — plan / 5-hour / weekly
 * limits are Claude.ai subscription data the embedded agent does not expose.
 */
const ContextUsageFooter: React.FC<ContextUsageFooterProps> = ({ t, conversation_id }) => {
  const usage = useContextUsage(conversation_id);
  if (!usage) return null;

  const pct = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const barColor = pct > 90 ? 'rgb(var(--danger-6))' : pct > 70 ? 'rgb(var(--warning-6))' : 'rgb(var(--primary-6))';

  return (
    <div className='border-t border-border-2 px-16px py-10px shrink-0'>
      <div className='flex items-center justify-between mb-6px'>
        <span className='text-12px text-t-secondary'>
          {t('conversation.context_usage.contextWindow', { defaultValue: 'Context window' })}
        </span>
        <span className='text-12px text-t-tertiary tabular-nums'>
          {formatTokenCount(usage.used)} / {formatTokenCount(usage.limit, true)} ({Math.round(pct)}%)
        </span>
      </div>
      <div className='h-4px w-full rd-999px bg-fill-3 overflow-hidden'>
        <div className='h-full rd-999px transition-all' style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
};

export default ContextUsageFooter;
