/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// REQ-027: the Skills-tab refresh button clears the per-session scan cache and
// bumps an epoch that re-runs the scan effect. These tests prove the wiring:
// epoch alone is deduped by the cache; clear() + epoch forces a fresh backend scan.

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

describe('useLoadedSkills refresh wiring (REQ-027)', () => {
  beforeEach(() => {
    clearSkillScanCache();
    scanForSkillsMock.mockReset().mockResolvedValue({ skills: [{ name: 'alpha', description: 'A skill' }] });
    // profiles-applied.json, settings.local.json and any SKILL.md repair → benign null.
    readFileMock.mockReset().mockResolvedValue(null);
    writeFileMock.mockReset();
  });
  afterEach(() => clearSkillScanCache());

  /** Bumping only the epoch re-runs the effect but hits the cache — no extra backend scan. */
  it('reuses the scan cache when only the epoch changes', async () => {
    const { result, rerender } = renderHook(({ epoch }) => useLoadedSkills('/ws', epoch), {
      initialProps: { epoch: 0 },
    });
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBeGreaterThan(0));
    const initialScans = scanForSkillsMock.mock.calls.length;
    await act(async () => {
      rerender({ epoch: 1 });
    });
    expect(scanForSkillsMock.mock.calls.length).toBe(initialScans);
  });

  /** clearSkillScanCache() + an epoch bump forces a fresh re-scan so deleted/new skills surface. */
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
