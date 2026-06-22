import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getUserConversations = vi.fn();

vi.mock('@/common', () => ({
  ipcBridge: {
    database: {
      getUserConversations: { invoke: (...args: unknown[]) => getUserConversations(...args) },
    },
  },
}));

import { useMcpRuntimeStatus } from '@renderer/hooks/mcp/useMcpRuntimeStatus';

const conv = (mcp_statuses: Array<{ id: string; name: string; status: string }>) => ({ extra: { mcp_statuses } });

describe('useMcpRuntimeStatus', () => {
  beforeEach(() => {
    getUserConversations.mockReset();
  });

  it('aggregates per server, keyed by both id and name, with loaded>failed>unsupported priority', async () => {
    getUserConversations.mockResolvedValue({
      items: [
        conv([{ id: 'a', name: 'alpha', status: 'failed' }]),
        conv([{ id: 'a', name: 'alpha', status: 'loaded' }]),
        conv([{ id: 'b', name: 'beta', status: 'failed' }]),
      ],
      total: 3,
      has_more: false,
    });

    const { result } = renderHook(() => useMcpRuntimeStatus());
    await waitFor(() => expect(result.current.statusMap.size).toBeGreaterThan(0));

    // 'a' loaded once + failed once → loaded wins; reachable by id and by name.
    expect(result.current.statusMap.get('a')).toEqual({ status: 'loaded', loaded: 1, failed: 1, unsupported: 0 });
    expect(result.current.statusMap.get('alpha')).toEqual({ status: 'loaded', loaded: 1, failed: 1, unsupported: 0 });
    // 'b' only failed → failed.
    expect(result.current.statusMap.get('b')?.status).toBe('failed');
  });

  it('survives a list fetch error (empty map, no throw)', async () => {
    getUserConversations.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMcpRuntimeStatus());
    await waitFor(() => expect(getUserConversations).toHaveBeenCalled());
    expect(result.current.statusMap.size).toBe(0);
  });
});
