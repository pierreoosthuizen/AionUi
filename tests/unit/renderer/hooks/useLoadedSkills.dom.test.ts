/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ISS-013: a cold-start scan resolves [] before the backend HTTP server is up.
// The hook must NOT cache that empty result for the session — it must self-evict
// and retry so skills appear once the backend comes up. This mock returns empty
// on the first scan pass and real skills afterwards, simulating that race.
let backendReady = false;

vi.mock('@/common/adapter/ipcBridge', () => ({
  fs: {
    scanForSkills: {
      invoke: vi.fn(async () =>
        backendReady ? { skills: [{ name: 'late-skill', description: 'appeared after warmup' }] } : { skills: [] }
      ),
    },
    readFile: { invoke: vi.fn(async () => null) },
  },
}));

vi.mock('@/renderer/hooks/agent/skillOverrides', () => ({
  loadSkillOverrides: vi.fn(async () => ({})),
  cycleSkillState: vi.fn(async () => undefined),
  stateFromLiteral: () => undefined,
}));

import { useLoadedSkills } from '@/renderer/hooks/agent/useLoadedSkills';

describe('useLoadedSkills staleness self-heal (ISS-013)', () => {
  /** Empty cold-start scan must not stick: once the backend is ready, the retry
   *  re-scans and skills appear without a remount. */
  it('recovers skills after an initial empty scan', async () => {
    const { result } = renderHook(() => useLoadedSkills('/ws'));

    // First pass resolves empty (backend not ready).
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBe(0));

    // Backend comes up; the bounded retry (1.5s) re-scans and populates.
    backendReady = true;
    await waitFor(() => expect(result.current.user.length + result.current.project.length).toBeGreaterThan(0), {
      timeout: 5000,
      interval: 100,
    });

    const names = [...result.current.user, ...result.current.project].map((s) => s.name);
    expect(names).toContain('late-skill');
  });
});
