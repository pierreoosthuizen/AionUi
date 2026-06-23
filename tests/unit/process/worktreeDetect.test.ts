import { describe, expect, it } from 'vitest';
import { isWorktreeByPaths } from '@process/utils/worktreeDetect';

describe('isWorktreeByPaths', () => {
  /** A normal clone: both paths point at the same .git folder. */
  it('returns false when git-dir equals git-common-dir', () => {
    expect(isWorktreeByPaths('/repo/.git', '/repo/.git')).toBe(false);
  });

  /** A linked worktree: git-dir is a per-worktree subfolder; common-dir is the main repo. */
  it('returns true when git-dir differs from git-common-dir', () => {
    expect(isWorktreeByPaths('/repo/.git/worktrees/feat-branch', '/repo/.git')).toBe(true);
  });

  /** Trailing newlines from execFile stdout must not cause false positives. */
  it('trims trailing whitespace before comparing', () => {
    expect(isWorktreeByPaths('/repo/.git\n', '/repo/.git\n')).toBe(false);
  });

  /** Leading/trailing spaces are stripped too. */
  it('trims surrounding spaces', () => {
    expect(isWorktreeByPaths('  /repo/.git  ', '  /repo/.git  ')).toBe(false);
  });
});
