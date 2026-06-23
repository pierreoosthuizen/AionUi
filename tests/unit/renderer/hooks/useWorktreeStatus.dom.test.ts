/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorktreeStatus } from '@/renderer/hooks/git/useWorktreeStatus';

const mockGitStatusInvoke = vi.fn();

vi.mock('@/common', () => ({
  ipcBridge: {
    git: {
      status: { invoke: (...args: unknown[]) => mockGitStatusInvoke(...args) },
    },
  },
}));

describe('useWorktreeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** No workspace → immediate idle state, IPC never called. */
  it('returns idle state when workspace is undefined', () => {
    const { result } = renderHook(() => useWorktreeStatus(undefined));
    expect(result.current).toEqual({ isWorktree: false, worktreeName: '' });
    expect(mockGitStatusInvoke).not.toHaveBeenCalled();
  });

  /** Non-repo workspace → idle state after IPC resolves. */
  it('returns idle state for a non-repo workspace', async () => {
    mockGitStatusInvoke.mockResolvedValue({ isRepo: false, currentBranch: null, branches: [] });
    const { result } = renderHook(() => useWorktreeStatus('/tmp/no-git'));
    await waitFor(() => expect(mockGitStatusInvoke).toHaveBeenCalledWith({ workspace: '/tmp/no-git' }));
    expect(result.current).toEqual({ isWorktree: false, worktreeName: '' });
  });

  /** Regular repo (not a worktree) → isWorktree false. */
  it('returns isWorktree false for a normal clone', async () => {
    mockGitStatusInvoke.mockResolvedValue({
      isRepo: true,
      isWorktree: false,
      worktreeName: '',
      currentBranch: 'main',
      branches: ['main'],
    });
    const { result } = renderHook(() => useWorktreeStatus('/repo'));
    await waitFor(() => expect(result.current.isWorktree).toBe(false));
    expect(result.current.worktreeName).toBe('');
  });

  /** Linked worktree → isWorktree true and worktreeName populated. */
  it('returns isWorktree true with branch name for a linked worktree', async () => {
    mockGitStatusInvoke.mockResolvedValue({
      isRepo: true,
      isWorktree: true,
      worktreeName: 'feat/worktree-badge',
      currentBranch: 'feat/worktree-badge',
      branches: ['main', 'feat/worktree-badge'],
    });
    const { result } = renderHook(() => useWorktreeStatus('/repo/.git/worktrees/feat-branch'));
    await waitFor(() => expect(result.current.isWorktree).toBe(true));
    expect(result.current.worktreeName).toBe('feat/worktree-badge');
  });

  /** IPC failure → falls back to idle, does not throw. */
  it('returns idle state when IPC call rejects', async () => {
    mockGitStatusInvoke.mockRejectedValue(new Error('IPC error'));
    const { result } = renderHook(() => useWorktreeStatus('/repo'));
    await waitFor(() => expect(mockGitStatusInvoke).toHaveBeenCalled());
    expect(result.current).toEqual({ isWorktree: false, worktreeName: '' });
  });
});
