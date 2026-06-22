/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { basename, dirname, join } from 'node:path';

/** Make a branch name safe to use as a single path segment. */
export function sanitizeBranchForPath(branch: string): string {
  return branch.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'worktree';
}

/**
 * Sibling-folder worktree location: `<repo-parent>/<repo>-worktrees/<branch>`.
 * Keeps worktrees out of the repo so they never show as untracked files.
 */
export function computeWorktreePath(workspace: string, branch: string): string {
  const repo = basename(workspace);
  const parent = dirname(workspace);
  return join(parent, `${repo}-worktrees`, sanitizeBranchForPath(branch));
}
