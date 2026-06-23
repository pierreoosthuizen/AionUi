/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for resetManagedPeer (REQ-007 peer restart-in-place):
 *
 * - Cold path: fresh module (vi.resetModules) → managed map empty.
 *   resetManagedPeer must return 'not_found' and make no broker I/O.
 * - Idempotent: multiple cold calls remain 'not_found' without side effects.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub node:fs so peerAutoPickup can load without hitting the real filesystem.
const statSync = vi.fn();
const readFileSync = vi.fn();

vi.mock('node:fs', () => ({
  get statSync() {
    return statSync;
  },
  get readFileSync() {
    return readFileSync;
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  statSync.mockReset();
  readFileSync.mockReset();
  // peers.json unreadable — name resolution returns undefined for all tests.
  statSync.mockImplementation(() => {
    throw new Error('ENOENT');
  });
  (globalThis as Record<string, unknown>).__backendPort = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('resetManagedPeer — cold path (managed map empty after module reset)', () => {
  it('returns not_found and makes no broker request', async () => {
    // No entry in the managed map → early return without calling the broker.
    const { resetManagedPeer } = await import('@/process/utils/peerAutoPickup');

    const result = await resetManagedPeer('conv-never-registered');

    expect(result.status).toBe('not_found');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is idempotent — repeated cold calls stay not_found without broker I/O', async () => {
    // Multiple calls to an unmanaged id must not corrupt state or call the broker.
    const { resetManagedPeer } = await import('@/process/utils/peerAutoPickup');

    const first = await resetManagedPeer('conv-abc');
    const second = await resetManagedPeer('conv-abc');
    const third = await resetManagedPeer('conv-abc');

    expect(first.status).toBe('not_found');
    expect(second.status).toBe('not_found');
    expect(third.status).toBe('not_found');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
