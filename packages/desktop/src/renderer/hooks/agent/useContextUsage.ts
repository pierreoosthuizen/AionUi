/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import { getConversationOrNull } from '@/renderer/pages/conversation/utils/conversationCache';
import { DEFAULT_CONTEXT_LIMIT } from '@/renderer/utils/model/modelContextLimits';

/**
 * Track an ACP conversation's context-window usage for display outside the chat
 * (e.g. the Project panel). Seeds from the persisted `extra.last_token_usage`
 * snapshot, then follows the live `acp_context_usage` stream events — the same
 * source the in-chat indicator uses. Only the context window is available;
 * plan / rate-limit data is not exposed by the embedded agent.
 */
export type ContextUsage = { used: number; limit: number };

export function useContextUsage(conversation_id?: string): ContextUsage | null {
  const [used, setUsed] = useState<number | null>(null);
  const [limit, setLimit] = useState<number>(DEFAULT_CONTEXT_LIMIT);

  useEffect(() => {
    if (!conversation_id) {
      setUsed(null);
      return;
    }
    let alive = true;

    void getConversationOrNull(conversation_id).then((c) => {
      if (!alive || !c || c.type !== 'acp') return;
      const seedUsed = c.extra?.last_token_usage?.total_tokens;
      const seedLimit = c.extra?.last_context_limit;
      if (typeof seedUsed === 'number') setUsed(seedUsed);
      if (typeof seedLimit === 'number' && seedLimit > 0) setLimit(seedLimit);
    });

    const off = ipcBridge.acpConversation.responseStream.on((m) => {
      if (m.conversation_id !== conversation_id || m.type !== 'acp_context_usage') return;
      const d = m.data as { used?: number; size?: number } | undefined;
      if (typeof d?.used === 'number') setUsed(d.used);
      if (typeof d?.size === 'number' && d.size > 0) setLimit(d.size);
    });

    return () => {
      alive = false;
      off();
    };
  }, [conversation_id]);

  return used === null ? null : { used, limit };
}
