/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Poll the main process for the live broker to_id assigned to a conversation by
 * peerAutoPickup. The to_id is the runtime routing target — it changes each time
 * the peer reconnects. Returns undefined when the conversation has no active
 * durable inbox (idle / offline). Used to display "[to_id]" next to peer names.
 */

import { useEffect, useState } from 'react';
import { ipcBridge } from '@/common';

const POLL_INTERVAL_MS = 3000;

/**
 * Returns the live broker to_id for a conversation, or undefined when not
 * currently resolved. Polls every 3 s so the UI stays reactive as peers
 * reconnect without requiring a push channel.
 */
export function usePeerToId(conversationId: string | undefined): string | undefined {
  const [toId, setToId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!conversationId) {
      setToId(undefined);
      return;
    }

    let alive = true;

    const poll = async () => {
      try {
        const result = await ipcBridge.peerBroker.getToId.invoke({ conversationId });
        if (alive) setToId(result ?? undefined);
      } catch {
        // broker unavailable — keep last known value
      }
    };

    void poll();
    const id = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [conversationId]);

  return toId;
}
