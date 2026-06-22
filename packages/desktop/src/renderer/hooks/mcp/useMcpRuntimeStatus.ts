/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { ipcBridge } from '@/common';
import type { IConversationMcpStatus, IConversationMcpStatusKind } from '@/common/config/storage';

/**
 * Aggregated runtime status for one MCP server across the user's conversations.
 * `last_test_status` (Settings) only reflects a manual config check; this is the
 * actual load result the embedded agent reported per conversation
 * (`extra.mcp_statuses`), surfaced today only in the in-chat "Loaded MCP" popover.
 */
export type McpRuntimeStatus = {
  status: IConversationMcpStatusKind;
  loaded: number;
  failed: number;
  unsupported: number;
};

// ponytail: one page is plenty — runtime status is a "did it load anywhere"
// glance, not an audit. Bump the limit or paginate if a user routinely keeps
// hundreds of live conversations.
const CONVERSATION_LIMIT = 200;

const aggregate = (status: McpRuntimeStatus): IConversationMcpStatusKind =>
  status.loaded > 0 ? 'loaded' : status.failed > 0 ? 'failed' : 'unsupported';

/**
 * Build a lookup of MCP runtime status keyed by both server id AND name so
 * callers can match a Settings server by whichever the snapshot carried.
 * Fetches once on mount; call `refresh()` to re-pull (e.g. a manual button).
 */
export function useMcpRuntimeStatus() {
  const [statusMap, setStatusMap] = useState<Map<string, McpRuntimeStatus>>(new Map());

  const refresh = useCallback(async () => {
    const result = await ipcBridge.database.getUserConversations.invoke({ limit: CONVERSATION_LIMIT });
    const tally = new Map<string, McpRuntimeStatus>();

    const bump = (key: string, kind: IConversationMcpStatusKind) => {
      if (!key) return;
      const entry = tally.get(key) ?? { status: 'unsupported', loaded: 0, failed: 0, unsupported: 0 };
      entry[kind] += 1;
      entry.status = aggregate(entry);
      tally.set(key, entry);
    };

    for (const conversation of result.items) {
      const statuses = (conversation.extra as { mcp_statuses?: IConversationMcpStatus[] } | undefined)?.mcp_statuses;
      if (!Array.isArray(statuses)) continue;
      for (const s of statuses) {
        bump(s.id, s.status);
        if (s.name && s.name !== s.id) bump(s.name, s.status);
      }
    }

    setStatusMap(tally);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      // Best-effort — leave the badge hidden if the list can't be read.
    });
  }, [refresh]);

  return { statusMap, refresh };
}
