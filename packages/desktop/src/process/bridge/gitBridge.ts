/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Git Bridge — native git for the conversation workspace.
 *
 * aioncore detects repos and lists branches but has no checkout/worktree
 * endpoints, so branch switching and worktree creation run `git` directly in
 * the main process (mirrors shellBridge). All ops are scoped to one workspace
 * folder via `git -C`.
 *
 * ponytail: shells out to the system `git`. No libgit2 dependency — git is a
 * hard requirement for this feature anyway, and the surface here is three
 * commands. Add a dependency only if we outgrow plumbing-via-CLI.
 */

import { execFile } from 'node:child_process';
import { ipcBridge } from '@/common';
import { sumNumstat } from '../utils/gitNumstat';
import { computeWorktreePath } from '../utils/worktreePath';
import { isWorktreeByPaths } from '../utils/worktreeDetect';

function git(workspace: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', ['-C', workspace, ...args], { maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error((stderr || '').trim() || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

async function isRepo(workspace: string): Promise<boolean> {
  try {
    return (await git(workspace, ['rev-parse', '--is-inside-work-tree'])).trim() === 'true';
  } catch {
    return false;
  }
}

async function branchExists(workspace: string, branch: string): Promise<boolean> {
  try {
    await git(workspace, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

export function initGitBridge(): void {
  ipcBridge.git.status.provider(async ({ workspace }) => {
    if (!workspace || !(await isRepo(workspace))) {
      return { isRepo: false, currentBranch: null, branches: [], isWorktree: false, worktreeName: '' };
    }
    const currentBranch = (await git(workspace, ['branch', '--show-current'])).trim() || null;
    const branches = (await git(workspace, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']))
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    // Detect linked worktree: git-dir ≠ git-common-dir.
    let isWorktree = false;
    let worktreeName = '';
    try {
      const gitDir = (await git(workspace, ['rev-parse', '--git-dir'])).trim();
      const commonDir = (await git(workspace, ['rev-parse', '--git-common-dir'])).trim();
      isWorktree = isWorktreeByPaths(gitDir, commonDir);
      if (isWorktree) {
        worktreeName = currentBranch ?? '';
      }
    } catch {
      // Non-fatal: leave isWorktree false if git plumbing fails.
    }

    return { isRepo: true, currentBranch, branches, isWorktree, worktreeName };
  });

  ipcBridge.git.checkout.provider(async ({ workspace, branch }) => {
    try {
      // Refuse to clobber: a dirty tree would silently carry changes across the
      // switch. Tell the user to commit/stash or spin a worktree instead.
      const dirty = (await git(workspace, ['status', '--porcelain'])).trim();
      if (dirty) {
        return { ok: false, error: 'dirty' };
      }
      await git(workspace, ['checkout', branch]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed', message: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcBridge.git.diffStat.provider(async ({ workspace }) => {
    try {
      if (!workspace || !(await isRepo(workspace))) return { added: 0, removed: 0 };
      // Working tree vs HEAD = staged + unstaged tracked changes.
      // ponytail: untracked files not counted (git diff ignores them). Add a
      // `ls-files --others` pass only if new-file totals need to show.
      return sumNumstat(await git(workspace, ['diff', '--numstat', 'HEAD']));
    } catch {
      return { added: 0, removed: 0 };
    }
  });

  ipcBridge.git.createWorktree.provider(async ({ workspace, branch, from }) => {
    try {
      const path = computeWorktreePath(workspace, branch);
      const exists = await branchExists(workspace, branch);
      // Existing branch → attach it; new name → create it off `from` (or HEAD).
      const args = exists ? ['worktree', 'add', path, branch] : ['worktree', 'add', '-b', branch, path, from || 'HEAD'];
      await git(workspace, args);
      return { ok: true, path, branch };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  });
}
