import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests peer-driven auto-grouping: a chat whose workspace maps to a peer group
 * (peers.json) lands in that group — creating it when absent — but never when the
 * chat is already grouped (so it is safe to re-run on open without fighting a
 * manual move).
 */
const { updateInvoke, resolvePeerGroup } = vi.hoisted(() => ({
  updateInvoke: vi.fn().mockResolvedValue({ success: true }),
  resolvePeerGroup: vi.fn(),
}));

vi.mock('@/common', () => ({
  ipcBridge: { conversation: { update: { invoke: updateInvoke } } },
}));
vi.mock('@/renderer/hooks/agent/usePeerIdentity', () => ({
  resolvePeerGroup: (...args: unknown[]) => resolvePeerGroup(...args),
}));
vi.mock('@/renderer/pages/conversation/utils/conversationCache', () => ({
  refreshConversationCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/renderer/utils/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

import { autoAssignPeerGroup } from '@/renderer/pages/conversation/GroupedHistory/hooks/useGroups';

const GROUPS_KEY = 'agora-chat-groups';
const readStored = (): Array<{ id: string; name: string }> => JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
const assignedGroupId = (): string =>
  (updateInvoke.mock.calls[0][0] as { updates: { extra: { groupId: string } } }).updates.extra.groupId;

beforeEach(() => {
  localStorage.clear();
  updateInvoke.mockClear();
  resolvePeerGroup.mockReset();
});

describe('autoAssignPeerGroup', () => {
  it('creates the named group when it does not exist and assigns the chat to it', async () => {
    resolvePeerGroup.mockResolvedValue('Agora');
    await autoAssignPeerGroup('c1', '/ws/agora');

    const stored = readStored();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Agora');
    expect(assignedGroupId()).toBe(stored[0].id);
  });

  it('reuses an existing group (case-insensitive) without creating a duplicate', async () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify([{ id: 'g-existing', name: 'Agora' }]));
    resolvePeerGroup.mockResolvedValue('  agora ');
    await autoAssignPeerGroup('c1', '/ws/agora');

    expect(readStored()).toHaveLength(1);
    expect(assignedGroupId()).toBe('g-existing');
  });

  it('skips entirely when the chat is already grouped (never overrides a manual move)', async () => {
    await autoAssignPeerGroup('c1', '/ws/agora', 'g-manual');

    expect(resolvePeerGroup).not.toHaveBeenCalled();
    expect(updateInvoke).not.toHaveBeenCalled();
  });

  it('does nothing when the workspace maps to no peer group', async () => {
    resolvePeerGroup.mockResolvedValue(undefined);
    await autoAssignPeerGroup('c1', '/ws/unknown');

    expect(updateInvoke).not.toHaveBeenCalled();
    expect(readStored()).toHaveLength(0);
  });

  it('does nothing when no workspace is provided', async () => {
    await autoAssignPeerGroup('c1', undefined);
    expect(updateInvoke).not.toHaveBeenCalled();
  });
});
