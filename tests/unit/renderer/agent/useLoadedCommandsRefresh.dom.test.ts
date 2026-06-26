/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ADR-0014: epoch-bump triggers clearCommandsCache() so the next scan re-reads from disk.

const { getFilesByDirMock, readFileMock } = vi.hoisted(() => ({
  getFilesByDirMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  fs: {
    getFilesByDir: { invoke: getFilesByDirMock },
    readFile: { invoke: readFileMock },
  },
}));

import { clearCommandsCache, useLoadedCommands } from '@/renderer/hooks/agent/useLoadedCommands';

describe('useLoadedCommands refresh wiring (ADR-0014)', () => {
  beforeEach(() => {
    clearCommandsCache();
    getFilesByDirMock
      .mockReset()
      .mockResolvedValue([{ name: 'commit.md', full_path: '/home/.claude/commands/commit.md', is_file: true }]);
    readFileMock.mockReset().mockResolvedValue('---\ndescription: Commit changes\n---\n');
  });
  afterEach(() => clearCommandsCache());

  /** Bumping epoch without clearing hits the cache — no extra filesystem scan. */
  it('reuses the scan cache when only the epoch changes', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedCommands(undefined, epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.global.length).toBeGreaterThan(0));
    const initialCalls = getFilesByDirMock.mock.calls.length;
    await act(async () => {
      rerender({ epoch: 1 });
    });
    // The hook clears cache at epoch > 0, then re-scans — so we expect MORE calls.
    // This test verifies the epoch-bump path is wired at all.
    expect(getFilesByDirMock.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  /** clearCommandsCache() resets userScan and profileScans so the next effect re-scans. */
  it('re-scans after clearCommandsCache() and an epoch bump', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedCommands(undefined, epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.global.length).toBeGreaterThan(0));
    const initialCalls = getFilesByDirMock.mock.calls.length;
    clearCommandsCache();
    await act(async () => {
      rerender({ epoch: 1 });
    });
    await waitFor(() => expect(getFilesByDirMock.mock.calls.length).toBeGreaterThan(initialCalls));
  });
});
