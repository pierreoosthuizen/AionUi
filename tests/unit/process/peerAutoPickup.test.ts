import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests the peers.json reload-on-miss self-heal in peerAutoPickup: a peer added
 * AFTER Agora launched must resolve without an app restart, while never-registered
 * workspaces must not trigger a re-read on every poll tick.
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

function peersJson(entries: Array<{ session_name: string; workspace: string }>): string {
  return JSON.stringify({ peers: entries });
}

const AGORA_WS = '/Users/p/agora/AionUi';

beforeEach(() => {
  vi.resetModules();
  statSync.mockReset();
  readFileSync.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('nameForWorkspace reload-on-miss', () => {
  it('resolves a peer added to peers.json after first load (self-heal on mtime bump)', async () => {
    const { nameForWorkspace } = await import('@/process/utils/peerAutoPickup');

    // First load: agora is NOT yet in the registry.
    statSync.mockReturnValue({ mtimeMs: 1 });
    readFileSync.mockReturnValue(peersJson([{ session_name: 'forge', workspace: '/Users/p/ImproveClaude' }]));
    expect(nameForWorkspace(AGORA_WS)).toBeUndefined();

    // peers.json edited: mtime advances and agora is now present.
    statSync.mockReturnValue({ mtimeMs: 2 });
    readFileSync.mockReturnValue(
      peersJson([
        { session_name: 'forge', workspace: '/Users/p/ImproveClaude' },
        { session_name: 'agora', workspace: AGORA_WS },
      ])
    );
    expect(nameForWorkspace(AGORA_WS)).toBe('agora');
  });

  it('does not re-read peers.json on a miss when the file is unchanged (no tick storm)', async () => {
    const { nameForWorkspace } = await import('@/process/utils/peerAutoPickup');

    statSync.mockReturnValue({ mtimeMs: 5 });
    readFileSync.mockReturnValue(peersJson([{ session_name: 'forge', workspace: '/Users/p/ImproveClaude' }]));

    // First miss loads once. Subsequent misses (same mtime) must not re-parse.
    nameForWorkspace('/Users/p/adhoc');
    const readsAfterFirst = readFileSync.mock.calls.length;
    nameForWorkspace('/Users/p/adhoc');
    nameForWorkspace('/Users/p/adhoc');
    expect(readFileSync.mock.calls.length).toBe(readsAfterFirst);
  });

  it('falls back to undefined (basename labelling) when peers.json is unreadable', async () => {
    const { nameForWorkspace } = await import('@/process/utils/peerAutoPickup');
    statSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(nameForWorkspace(AGORA_WS)).toBeUndefined();
  });

  it('resolves a registered peer on the hit path without re-stating the file', async () => {
    const { nameForWorkspace } = await import('@/process/utils/peerAutoPickup');

    statSync.mockReturnValue({ mtimeMs: 9 });
    readFileSync.mockReturnValue(peersJson([{ session_name: 'agora', workspace: AGORA_WS }]));

    expect(nameForWorkspace(AGORA_WS)).toBe('agora'); // first call loads
    const statsAfterFirst = statSync.mock.calls.length;
    expect(nameForWorkspace(AGORA_WS)).toBe('agora'); // hit from cache
    expect(statSync.mock.calls.length).toBe(statsAfterFirst); // no extra stat on a hit
  });
});
