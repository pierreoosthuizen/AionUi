/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// REQ-027 / ADR-0014: the Skills-tab refresh button bumps an epoch that re-runs
// the scan effect. As of ADR-0014, the hook clears its own cache at the start of
// the effect when epoch > 0 — so a bare epoch bump is sufficient to force a fresh
// backend scan. The SkillsList component still calls clearSkillScanCache() before
// bumping its internal epoch (harmless double-clear), and the external refresh
// button (WorkspaceTabBar) relies solely on the epoch prop flowing from ChatWorkspace.

const { scanForSkillsMock, readFileMock, writeFileMock } = vi.hoisted(() => ({
  scanForSkillsMock: vi.fn(),
  readFileMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  fs: {
    scanForSkills: { invoke: scanForSkillsMock },
    readFile: { invoke: readFileMock },
    writeFile: { invoke: writeFileMock },
  },
}));

import { clearSkillScanCache, useLoadedSkills } from '@/renderer/hooks/agent/useLoadedSkills';

describe('useLoadedSkills refresh wiring (REQ-027 / ADR-0014)', () => {
  beforeEach(() => {
    clearSkillScanCache();
    scanForSkillsMock.mockReset().mockResolvedValue({ skills: [{ name: 'alpha', description: 'A skill' }] });
    // profiles-applied.json, settings.local.json and any SKILL.md repair → benign null.
    readFileMock.mockReset().mockResolvedValue(null);
    writeFileMock.mockReset();
  });
  afterEach(() => clearSkillScanCache());

  /** epoch=0 (cold start) does not clear the cache — scanning happens once. */
  it('does not clear the cache on cold start (epoch 0)', async () => {
    const { result } = renderHook(() => useLoadedSkills('/ws', 0));
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBeGreaterThan(0));
    const scansAfterMount = scanForSkillsMock.mock.calls.length;
    // Mount a second hook with the same cache — should be a cache hit, no extra scan.
    renderHook(() => useLoadedSkills('/ws', 0));
    await new Promise((r) => setTimeout(r, 50));
    expect(scanForSkillsMock.mock.calls.length).toBe(scansAfterMount);
  });

  /** Bumping epoch > 0 clears the cache inside the hook and forces a fresh backend scan. */
  it('re-scans when epoch is bumped (hook clears cache automatically)', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedSkills('/ws', epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBeGreaterThan(0));
    const initialScans = scanForSkillsMock.mock.calls.length;
    await act(async () => {
      rerender({ epoch: 1 });
    });
    await waitFor(() => expect(scanForSkillsMock.mock.calls.length).toBeGreaterThan(initialScans));
  });

  /** clearSkillScanCache() + epoch bump also forces a fresh re-scan (SkillsList internal refresh path). */
  it('re-scans after clearSkillScanCache() and an epoch bump', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedSkills('/ws', epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBeGreaterThan(0));
    const initialScans = scanForSkillsMock.mock.calls.length;
    clearSkillScanCache();
    await act(async () => {
      rerender({ epoch: 1 });
    });
    await waitFor(() => expect(scanForSkillsMock.mock.calls.length).toBeGreaterThan(initialScans));
  });
});
