/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Determine whether a git directory and common-dir path indicate a worktree.
 *
 * Git sets --git-common-dir to the main repo's .git folder; for a linked
 * worktree the two paths differ. This pure function keeps the detection logic
 * isolated from the execFile plumbing so it can be unit-tested without spawning
 * child processes.
 */
export function isWorktreeByPaths(gitDir: string, commonDir: string): boolean {
  return gitDir.trim() !== commonDir.trim();
}
