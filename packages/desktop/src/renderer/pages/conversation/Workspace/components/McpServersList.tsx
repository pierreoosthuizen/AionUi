/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLoadedMcpServers } from '@/renderer/hooks/agent/useLoadedMcpServers';
import type { SkillGroups } from '@/renderer/hooks/agent/useLoadedSkills';
import { ApiApp } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';
import GroupedItemList from './GroupedItemList';

type McpServersListProps = {
  t: TFunction;
  workspace?: string;
  refreshEpoch?: number;
};

/** Agent → MCP tab: MCP servers the embedded agent sees, grouped by config scope.
 *  Read-only (rows don't drop into the sendbox like skills/commands do). */
const McpServersList: React.FC<McpServersListProps> = ({ t, workspace, refreshEpoch = 0 }) => {
  const { user, local, project } = useLoadedMcpServers(workspace, refreshEpoch);
  const groups: SkillGroups = {
    global: user,
    profiles: [
      { name: t('conversation.workspace.mcp.projectScope', { defaultValue: 'Project' }), skills: project },
      { name: t('conversation.workspace.mcp.localScope', { defaultValue: 'Local' }), skills: local },
    ],
  };

  return (
    <GroupedItemList
      groups={groups}
      icon={<ApiApp theme='outline' size={14} strokeWidth={2.5} />}
      globalLabel={t('conversation.workspace.mcp.userScope', { defaultValue: 'User' })}
      searchPlaceholder={t('conversation.workspace.mcp.search', { defaultValue: 'Search servers…' })}
      emptyText={t('conversation.workspace.mcp.empty', { defaultValue: 'No MCP servers' })}
      storageKey='agora-mcp-collapsed'
      itemPrefix=''
      clickToFill={false}
    />
  );
};

export default McpServersList;
