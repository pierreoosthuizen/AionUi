/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { assembleSnapshot, type BrokerPeer } from '@process/services/metricsRecorder';

// persist()/initSchema() open a native better-sqlite3 db, whose binary is built for
// Electron's ABI — it can't load under the vitest/bun runner. The DB write path is
// exercised in e2e (Electron) instead; the risk-bearing logic here (counting,
// filtering, null-mapping) is pure and fully covered below.

const peer = (over: Partial<BrokerPeer>): BrokerPeer => ({
  id: 'i',
  peer_name: 'p',
  managed_key: 'k',
  cwd: '/c',
  ...over,
});

describe('assembleSnapshot', () => {
  /** Reads each window's utilization + reset into the flat snapshot shape. */
  it('maps session and weekly usage from the plan-usage payload', () => {
    const { snapshot } = assembleSnapshot({
      ts: 100,
      usage: {
        session: { utilization: 75, resetsAt: '2026-06-22T22:00:00Z' },
        weekly: { utilization: 50, resetsAt: '2026-06-25T18:59:00Z' },
      },
      peers: [],
      convs: { open: 0, running: 0 },
      rss: 999,
    });
    expect(snapshot.session_pct).toBe(75);
    expect(snapshot.weekly_pct).toBe(50);
    expect(snapshot.weekly_resets_at).toBe('2026-06-25T18:59:00Z');
    expect(snapshot.ts).toBe(100);
    expect(snapshot.rss_bytes).toBe(999);
  });

  /** Usage endpoint offline → null fields, never a throw. */
  it('records null usage when the plan-usage fetch returned null', () => {
    const { snapshot } = assembleSnapshot({ ts: 1, usage: null, peers: [], convs: { open: 0, running: 0 }, rss: 0 });
    expect(snapshot.session_pct).toBeNull();
    expect(snapshot.weekly_pct).toBeNull();
    expect(snapshot.session_resets_at).toBeNull();
  });

  /** peers_running counts every live peer; peers_open only the managed (chat) ones. */
  it('separates total live peers from managed chat peers', () => {
    const { snapshot, peers } = assembleSnapshot({
      ts: 1,
      usage: null,
      peers: [
        peer({ managed_key: 'a', busy: 1 }),
        peer({ managed_key: 'b', busy: 0 }),
        peer({ managed_key: null, peer_name: null }),
      ],
      convs: { open: 3, running: 1 },
      rss: 0,
    });
    expect(snapshot.peers_running).toBe(3);
    expect(snapshot.peers_open).toBe(2);
    expect(snapshot.peers_busy).toBe(1);
    expect(snapshot.conversations_running).toBe(1);
    // terminal peer (managed_key null) is excluded from the per-peer rows
    expect(peers).toHaveLength(2);
    expect(peers.every((p) => p.managed_key)).toBe(true);
  });

  /** Empty broker result → all zero counts, empty peer rows, no throw. */
  it('handles an empty peer list', () => {
    const { snapshot, peers } = assembleSnapshot({
      ts: 1,
      usage: null,
      peers: [],
      convs: { open: 0, running: 0 },
      rss: 0,
    });
    expect(snapshot.peers_running).toBe(0);
    expect(snapshot.peers_open).toBe(0);
    expect(peers).toHaveLength(0);
  });

  /** A managed peer with no busy flag is recorded as not-busy, not undefined. */
  it('defaults a missing busy flag to 0 in the peer rows', () => {
    const { snapshot, peers } = assembleSnapshot({
      ts: 1,
      usage: null,
      peers: [peer({ managed_key: 'a', busy: undefined })],
      convs: { open: 0, running: 0 },
      rss: 0,
    });
    expect(snapshot.peers_busy).toBe(0);
    expect(peers[0].busy).toBe(0);
  });
});
