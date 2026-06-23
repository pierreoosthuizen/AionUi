import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- mock mcpService before importing the hook ---
const toggleServerMock = vi.fn();

vi.mock('@/common/adapter/ipcBridge', () => ({
  mcpService: {
    toggleServer: { invoke: (...args: unknown[]) => toggleServerMock(...args) },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { useMcpReconnect } from '@renderer/hooks/mcp/useMcpReconnect';
import type { IMcpServer } from '@/common/config/storage';

const buildServer = (enabled = true): IMcpServer =>
  ({
    id: 'srv-1',
    name: 'test-server',
    enabled,
    transport: { type: 'http', url: 'http://localhost:9000' },
    last_test_status: undefined,
    created_at: 0,
    updated_at: 0,
    original_json: '{}',
  }) as IMcpServer;

describe('useMcpReconnect', () => {
  beforeEach(() => {
    toggleServerMock.mockReset();
    // Use real timers — fake timers cause the internal setTimeout delay to
    // deadlock when combined with async act() in renderHook tests.
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sequences toggle-off then toggle-on for an enabled server', async () => {
    // Verifies the full reconnect sequence: toggle off → delay → toggle on → test-connection.
    const server = buildServer(true);
    const afterToggle = { ...server, enabled: false };
    const afterReconnect = { ...server, enabled: true };

    toggleServerMock
      .mockResolvedValueOnce(afterToggle) // toggle off
      .mockResolvedValueOnce(afterReconnect); // toggle on

    const setMcpServers = vi.fn();
    const onTestConnection = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useMcpReconnect(setMcpServers, onTestConnection));

    const outcome = await act(async () => result.current.handleReconnect(server));

    expect(outcome.success).toBe(true);
    // toggle was called twice: once off, once on.
    expect(toggleServerMock).toHaveBeenCalledTimes(2);
    expect(toggleServerMock).toHaveBeenNthCalledWith(1, { id: server.id });
    expect(toggleServerMock).toHaveBeenNthCalledWith(2, { id: server.id });
    // test-connection was called once with the reconnected server record.
    expect(onTestConnection).toHaveBeenCalledTimes(1);
    expect(onTestConnection).toHaveBeenCalledWith(afterReconnect, { notify: false });
  });

  it('skips the first toggle for a disabled server and only calls toggle once', async () => {
    // When the server is already disabled there is no off-toggle — only the on-toggle.
    const server = buildServer(false);
    const afterReconnect = { ...server, enabled: true };

    toggleServerMock.mockResolvedValueOnce(afterReconnect);

    const setMcpServers = vi.fn();
    const onTestConnection = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useMcpReconnect(setMcpServers, onTestConnection));

    const outcome = await act(async () => result.current.handleReconnect(server));

    expect(outcome.success).toBe(true);
    expect(toggleServerMock).toHaveBeenCalledTimes(1);
    expect(onTestConnection).toHaveBeenCalledTimes(1);
  });

  it('returns success:false and does not call test-connection when toggle throws', async () => {
    // Verifies error propagation: a thrown toggle surfaces as success:false without crashing.
    const server = buildServer(true);
    toggleServerMock.mockRejectedValue(new Error('network error'));

    const setMcpServers = vi.fn();
    const onTestConnection = vi.fn();

    const { result } = renderHook(() => useMcpReconnect(setMcpServers, onTestConnection));

    const outcome = await act(async () => result.current.handleReconnect(server));

    expect(outcome.success).toBe(false);
    expect(outcome.error).toBe('network error');
    expect(onTestConnection).not.toHaveBeenCalled();
  });

  it('prevents duplicate in-flight reconnects for the same server', async () => {
    // A second call while the first is still in-flight must be rejected immediately.
    const server = buildServer(true);
    // First call hangs indefinitely to simulate in-flight.
    toggleServerMock.mockImplementation(() => new Promise(() => {}));

    const setMcpServers = vi.fn();
    const onTestConnection = vi.fn();

    const { result } = renderHook(() => useMcpReconnect(setMcpServers, onTestConnection));

    // Fire first reconnect (does not resolve within test).
    act(() => {
      void result.current.handleReconnect(server);
    });

    // Immediately fire second reconnect — should be rejected early.
    let secondOutcome: { success: boolean; error?: string } | undefined;
    await act(async () => {
      secondOutcome = await result.current.handleReconnect(server);
    });

    expect(secondOutcome?.success).toBe(false);
    // Only the first toggle call was made (second call bailed before invoking toggle).
    expect(toggleServerMock).toHaveBeenCalledTimes(1);
  });
});
