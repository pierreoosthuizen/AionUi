/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ADR-0014: useLoadedMcpServers has no module-level cache; adding epoch to the
// dep array is sufficient — JSON files are re-read on every epoch change.

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  fs: {
    readFile: { invoke: readFileMock },
  },
}));

import { useLoadedMcpServers } from '@/renderer/hooks/agent/useLoadedMcpServers';

describe('useLoadedMcpServers refresh wiring (ADR-0014)', () => {
  beforeEach(() => {
    readFileMock
      .mockReset()
      .mockResolvedValue(JSON.stringify({ mcpServers: { 'test-server': { command: 'npx', args: ['test-mcp'] } } }));
  });

  /** epoch bump re-runs the effect, re-reading JSON files from disk. */
  it('re-reads MCP config files when epoch is bumped', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedMcpServers(undefined, epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.user.length).toBeGreaterThan(0));
    const initialCalls = readFileMock.mock.calls.length;
    await act(async () => {
      rerender({ epoch: 1 });
    });
    await waitFor(() => expect(readFileMock.mock.calls.length).toBeGreaterThan(initialCalls));
  });
});
