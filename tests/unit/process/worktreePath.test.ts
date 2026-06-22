import { describe, expect, it } from 'vitest';
import { computeWorktreePath, sanitizeBranchForPath } from '@process/utils/worktreePath';

describe('sanitizeBranchForPath', () => {
  it('keeps safe chars, replaces the rest, trims edge dashes', () => {
    expect(sanitizeBranchForPath('feature/login')).toBe('feature-login');
    expect(sanitizeBranchForPath('fix/ABC-123_v2.1')).toBe('fix-ABC-123_v2.1');
    expect(sanitizeBranchForPath('///weird///')).toBe('weird');
    expect(sanitizeBranchForPath('!!!')).toBe('worktree');
  });
});

describe('computeWorktreePath', () => {
  it('places the worktree in a sibling <repo>-worktrees folder', () => {
    expect(computeWorktreePath('/home/me/proj', 'feature/login')).toBe('/home/me/proj-worktrees/feature-login');
    expect(computeWorktreePath('/a/b/AionUi', 'main')).toBe('/a/b/AionUi-worktrees/main');
  });
});
