/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Dropdown, Input, Menu, Modal, Tooltip } from '@arco-design/web-react';
import { BranchOne, Check, FolderPlus } from '@icon-park/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceGit } from './useWorkspaceGit';

type WorkspaceGitControlsProps = {
  conversation_id: string;
  workspace?: string;
};

/**
 * Branch switcher + worktree creator under the chat input. Only renders when the
 * conversation's workspace is a git repo. Lives here (not the right panel) so it
 * survives collapsing the panel.
 */
const WorkspaceGitControls: React.FC<WorkspaceGitControlsProps> = ({ conversation_id, workspace }) => {
  const { t } = useTranslation();
  const { status, diff, checkout, createWorktree } = useWorkspaceGit(conversation_id, workspace);
  const [wtOpen, setWtOpen] = useState(false);
  const [wtBranch, setWtBranch] = useState('');
  const [creating, setCreating] = useState(false);

  if (!status.isRepo) return null;

  const branchMenu = (
    <Menu onClickMenuItem={(branch) => void checkout(branch)} style={{ maxHeight: 280, overflow: 'auto' }}>
      {status.branches.map((branch) => (
        <Menu.Item key={branch}>
          <span className='inline-flex items-center gap-6px'>
            <Check size={12} className={branch === status.currentBranch ? 'opacity-100' : 'opacity-0'} />
            <span className='break-all'>{branch}</span>
          </span>
        </Menu.Item>
      ))}
    </Menu>
  );

  const submitWorktree = async () => {
    setCreating(true);
    await createWorktree(wtBranch);
    setCreating(false);
    setWtOpen(false);
    setWtBranch('');
  };

  return (
    <div className='flex items-center gap-6px'>
      <Dropdown trigger='click' droplist={branchMenu} position='tl'>
        <Button size='mini' type='outline' shape='round' icon={<BranchOne size={13} />}>
          <span className='max-w-160px truncate'>{status.currentBranch ?? '—'}</span>
        </Button>
      </Dropdown>
      <Tooltip content={t('conversation.git.createWorktree')}>
        <Button
          size='mini'
          type='outline'
          shape='circle'
          icon={<FolderPlus size={13} />}
          onClick={() => setWtOpen(true)}
        />
      </Tooltip>
      {(diff.added > 0 || diff.removed > 0) && (
        <Tooltip content={t('conversation.git.diffTooltip')}>
          <span
            className='inline-flex items-center gap-4px text-12px font-mono px-6px py-2px rounded-full'
            style={{ border: '1px solid var(--color-border-2)' }}
          >
            <span className='text-success'>+{diff.added.toLocaleString()}</span>
            <span className='text-danger'>−{diff.removed.toLocaleString()}</span>
          </span>
        </Tooltip>
      )}

      <Modal
        title={t('conversation.git.createWorktree')}
        visible={wtOpen}
        onCancel={() => setWtOpen(false)}
        onOk={() => void submitWorktree()}
        confirmLoading={creating}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !wtBranch.trim() }}
      >
        <Input value={wtBranch} onChange={setWtBranch} placeholder={t('conversation.git.worktreeBranchPlaceholder')} />
        <div className='mt-8px text-12px text-t-tertiary'>{t('conversation.git.worktreeHint')}</div>
      </Modal>
    </div>
  );
};

export default WorkspaceGitControls;
