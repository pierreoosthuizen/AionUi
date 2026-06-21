/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useWorkspaceChanges } from '@/renderer/hooks/chat/useWorkspaceChanges';
import { Button } from '@arco-design/web-react';
import { BranchOne } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';

type CommitBarProps = {
  t: TFunction;
  workspace?: string;
  /** Send the commit instruction to the agent. */
  onCommit: () => void;
  disabled?: boolean;
};

const basename = (p: string): string =>
  p
    .replace(/[/\\]+$/, '')
    .split(/[/\\]/)
    .pop() || p;

/**
 * Claude-Desktop-style commit bar shown above the sendbox when the workspace is
 * a git repo with uncommitted changes. Clicking "Commit changes" asks the
 * embedded agent to stage + commit (per the chosen agent-routed execution).
 */
const CommitBar: React.FC<CommitBarProps> = ({ t, workspace, onCommit, disabled }) => {
  const { count, branch, mode } = useWorkspaceChanges(workspace);

  // Only meaningful for real git repos with pending changes.
  if (!workspace || mode !== 'git-repo' || count === 0) return null;

  return (
    <div className='flex items-center gap-8px mb-8px px-12px py-6px rd-8px bg-fill-2 border border-[var(--color-border)]'>
      <span className='text-13px font-600 text-t-primary overflow-hidden text-ellipsis whitespace-nowrap'>
        {basename(workspace)}
      </span>
      {branch && (
        <span className='flex items-center gap-2px text-12px text-t-tertiary min-w-0'>
          <BranchOne size={13} className='shrink-0' />
          <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{branch}</span>
        </span>
      )}
      <span className='ml-auto text-12px text-t-tertiary shrink-0'>
        {t('conversation.commit.changeCount', { count, defaultValue: '{{count}} changed' })}
      </span>
      <Button size='mini' type='outline' disabled={disabled} onClick={onCommit}>
        {t('conversation.commit.button', { defaultValue: 'Commit changes' })}
      </Button>
    </div>
  );
};

export default CommitBar;
