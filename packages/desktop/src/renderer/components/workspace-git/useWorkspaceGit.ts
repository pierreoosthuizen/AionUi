/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { Message } from '@arco-design/web-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { getConversationOrNull } from '@/renderer/pages/conversation/utils/conversationCache';
import { emitter } from '@/renderer/utils/emitter';

export type GitStatus = { isRepo: boolean; currentBranch: string | null; branches: string[] };

const EMPTY: GitStatus = { isRepo: false, currentBranch: null, branches: [] };

/**
 * Native git state + actions for a conversation's workspace. Reads branch list
 * via the main process; checkout and worktree creation mutate the repo and then
 * refresh. Worktree creation also repoints the conversation at the new folder.
 */
export function useWorkspaceGit(conversation_id: string, workspace?: string) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const [status, setStatus] = useState<GitStatus>(EMPTY);

  const refresh = useCallback(async () => {
    if (!workspace) {
      setStatus(EMPTY);
      return;
    }
    try {
      setStatus(await ipcBridge.git.status.invoke({ workspace }));
    } catch {
      setStatus(EMPTY);
    }
  }, [workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkout = useCallback(
    async (branch: string) => {
      if (!workspace || branch === status.currentBranch) return;
      const res = await ipcBridge.git.checkout.invoke({ workspace, branch });
      if (res.ok) {
        emitter.emit('acp.workspace.refresh');
        await refresh();
        Message.success(t('conversation.git.checkoutSuccess', { branch }));
        return;
      }
      if (res.error === 'dirty') {
        Message.warning(t('conversation.git.dirtyTree'));
        return;
      }
      Message.error(res.message || t('conversation.git.checkoutFailed'));
    },
    [workspace, status.currentBranch, refresh, t]
  );

  const createWorktree = useCallback(
    async (branch: string) => {
      if (!workspace || !branch.trim()) return;
      const res = await ipcBridge.git.createWorktree.invoke({ workspace, branch: branch.trim() });
      if (!res.ok || !res.path) {
        Message.error(res.message || t('conversation.git.worktreeFailed'));
        return;
      }
      // Point the conversation at the new worktree so the agent works there.
      const conversation = await getConversationOrNull(conversation_id);
      if (conversation) {
        const nextExtra = { ...conversation.extra, workspace: res.path, custom_workspace: true };
        await ipcBridge.conversation.update.invoke({ id: conversation_id, updates: { extra: nextExtra } });
        await mutate(`conversation/${conversation_id}`, { ...conversation, extra: nextExtra }, false);
      }
      emitter.emit('acp.workspace.refresh');
      emitter.emit('chat.history.refresh');
      Message.success(t('conversation.git.worktreeSuccess', { branch: res.branch ?? branch }));
    },
    [workspace, conversation_id, mutate, t]
  );

  return { status, refresh, checkout, createWorktree };
}
