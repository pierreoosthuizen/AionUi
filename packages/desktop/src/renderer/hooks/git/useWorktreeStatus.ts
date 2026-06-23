/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { useEffect, useState } from 'react';

/** Worktree state resolved from the main-process git bridge. */
export type WorktreeStatus = {
  isWorktree: boolean;
  worktreeName: string;
};

const IDLE: WorktreeStatus = { isWorktree: false, worktreeName: '' };

/**
 * Resolve whether the given workspace path is a git linked worktree, and if
 * so, its branch name. Returns `{ isWorktree: false, worktreeName: '' }` for
 * non-repo or non-worktree workspaces.
 *
 * Calls `git.status` IPC once per workspace change. The result is stable for
 * the lifetime of the workspace string — no polling.
 */
export function useWorktreeStatus(workspace?: string): WorktreeStatus {
  const [status, setStatus] = useState<WorktreeStatus>(IDLE);

  useEffect(() => {
    if (!workspace) {
      setStatus(IDLE);
      return;
    }
    let alive = true;
    ipcBridge.git.status
      .invoke({ workspace })
      .then((result) => {
        if (!alive) return;
        if (!result.isRepo) {
          setStatus(IDLE);
          return;
        }
        setStatus({
          isWorktree: result.isWorktree ?? false,
          worktreeName: result.worktreeName ?? '',
        });
      })
      .catch(() => {
        if (alive) setStatus(IDLE);
      });
    return () => {
      alive = false;
    };
  }, [workspace]);

  return status;
}
