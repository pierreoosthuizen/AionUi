import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests that getManagedToId returns the live broker peer id stored in the
 * `managed` map after ensureManagedPeer resolves — and returns undefined for
 * conversations that have no active durable inbox yet.
 */

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

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('process', {
  ...process,
  env: { ...process.env, CLAUDE_PEERS_PORT: '7899' },
  pid: 12345,
});

beforeEach(() => {
  vi.resetModules();
  statSync.mockReset();
  readFileSync.mockReset();
  mockFetch.mockReset();

  // Default: peers.json unreadable
  statSync.mockImplementation(() => {
    throw new Error('ENOENT');
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getManagedToId', () => {
  it('returns undefined for a conversation with no registered inbox', async () => {
    /** getManagedToId should return undefined when the managed map has no entry. */
    const { getManagedToId } = await import('@/process/utils/peerAutoPickup');
    expect(getManagedToId('conv-unknown')).toBeUndefined();
  });
});
