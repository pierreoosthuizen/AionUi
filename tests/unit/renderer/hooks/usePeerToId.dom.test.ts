import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcBridge } from '@/common';
import { usePeerToId } from '@/renderer/hooks/agent/usePeerToId';

vi.mock('@/common', () => ({
  ipcBridge: {
    peerBroker: {
      getToId: {
        invoke: vi.fn(),
      },
    },
  },
}));

describe('usePeerToId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the broker to_id when the IPC call resolves with a value', async () => {
    /** Verifies that the hook surfaces a resolved broker to_id from the main process. */
    vi.mocked(ipcBridge.peerBroker.getToId.invoke).mockResolvedValue('2ptptois');

    const { result } = renderHook(() => usePeerToId('conv-abc'));

    await waitFor(() => {
      expect(result.current).toBe('2ptptois');
    });
    expect(ipcBridge.peerBroker.getToId.invoke).toHaveBeenCalledWith({ conversationId: 'conv-abc' });
  });

  it('returns undefined when the IPC call resolves with undefined (peer not active)', async () => {
    /** Verifies that the hook returns undefined when the peer has no active inbox. */
    vi.mocked(ipcBridge.peerBroker.getToId.invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePeerToId('conv-xyz'));

    // Initial state is undefined; after the first poll it stays undefined.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBeUndefined();
  });

  it('returns undefined and does not invoke IPC when conversationId is undefined', async () => {
    /** Verifies that the hook skips IPC when no conversation id is provided. */
    const { result } = renderHook(() => usePeerToId(undefined));

    expect(result.current).toBeUndefined();
    expect(ipcBridge.peerBroker.getToId.invoke).not.toHaveBeenCalled();
  });

  it('does not throw when the IPC call fails (broker unavailable)', async () => {
    /** Verifies that IPC errors are silently swallowed so the UI does not crash. */
    vi.mocked(ipcBridge.peerBroker.getToId.invoke).mockRejectedValue(new Error('broker offline'));

    const { result } = renderHook(() => usePeerToId('conv-err'));

    // Should remain undefined — no crash
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBeUndefined();
  });
});
