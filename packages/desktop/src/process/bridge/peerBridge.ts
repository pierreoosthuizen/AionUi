/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer bridge — exposes per-conversation peer management to the renderer.
 *
 * Currently covers restart-in-place (REQ-007): unregister the durable broker
 * peer for a conversation and let peerAutoPickup re-register fresh on the next
 * tick.  The conversation_id / managed_key are preserved throughout.
 */

import { ipcBridge } from '@/common';
import { resetManagedPeer } from '@process/utils/peerAutoPickup';

export function initPeerBridge(): void {
  ipcBridge.peer.restart.provider(async ({ conversation_id }) => {
    try {
      const result = await resetManagedPeer(conversation_id);
      return { success: true, status: result.status };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[PeerBridge] peer:restart failed for ${conversation_id}:`, e);
      return { success: false, msg };
    }
  });
}
