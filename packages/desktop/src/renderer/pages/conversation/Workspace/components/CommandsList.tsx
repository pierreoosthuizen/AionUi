/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLoadedCommands } from '@/renderer/hooks/agent/useLoadedCommands';
import { Terminal } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';
import GroupedItemList from './GroupedItemList';

type CommandsListProps = {
  t: TFunction;
  workspace?: string;
};

/** Agent → Commands tab: slash-commands available to the agent, grouped by origin. */
const CommandsList: React.FC<CommandsListProps> = ({ t, workspace }) => (
  <GroupedItemList
    groups={useLoadedCommands(workspace)}
    icon={<Terminal theme='outline' size={14} strokeWidth={2.5} />}
    globalLabel={t('conversation.workspace.skills.globalSection', { defaultValue: 'Global' })}
    searchPlaceholder={t('conversation.workspace.commands.search', { defaultValue: 'Search commands…' })}
    emptyText={t('conversation.workspace.commands.empty', { defaultValue: 'No commands loaded' })}
  />
);

export default CommandsList;
