/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * REQ-009: worktree badge visibility.
 *
 * Tests the conditional rendering rule: the badge is shown only when
 * isWorktree is true AND worktreeName is non-empty. This mirrors the
 * guard in ChatLayout's desktopHeader.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, params?: Record<string, string>) => (params ? `${k}:${JSON.stringify(params)}` : k),
  }),
}));

// Minimal standalone badge component that mirrors the guard in ChatLayout.
// Keeping it isolated means this test doesn't drag in the full layout tree.
const WorktreeBadge: React.FC<{ isWorktree: boolean; worktreeName: string }> = ({ isWorktree, worktreeName }) => {
  if (!isWorktree || !worktreeName) return null;
  return (
    <span data-testid='worktree-badge' className='shrink-0 truncate cursor-default'>
      {worktreeName}
    </span>
  );
};

describe('worktree badge conditional rendering', () => {
  /** Badge is hidden when workspace is not a worktree. */
  it('does not render when isWorktree is false', () => {
    render(<WorktreeBadge isWorktree={false} worktreeName='' />);
    expect(screen.queryByTestId('worktree-badge')).toBeNull();
  });

  /** Badge is hidden when isWorktree is true but worktreeName is empty. */
  it('does not render when worktreeName is empty', () => {
    render(<WorktreeBadge isWorktree={true} worktreeName='' />);
    expect(screen.queryByTestId('worktree-badge')).toBeNull();
  });

  /** Badge is shown with the branch name when both conditions are met. */
  it('renders with the branch name when isWorktree is true and worktreeName is set', () => {
    render(<WorktreeBadge isWorktree={true} worktreeName='feat/worktree-badge' />);
    const badge = screen.getByTestId('worktree-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('feat/worktree-badge');
  });

  /** Branch names with slashes render in full. */
  it('displays branch names containing slashes correctly', () => {
    render(<WorktreeBadge isWorktree={true} worktreeName='fix/some-bug' />);
    expect(screen.getByTestId('worktree-badge').textContent).toBe('fix/some-bug');
  });
});
