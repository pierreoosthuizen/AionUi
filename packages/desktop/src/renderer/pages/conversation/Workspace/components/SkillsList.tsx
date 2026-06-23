/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useLoadedSkills,
  type SkillGroups,
  type SkillItem,
  type SkillState,
} from '@/renderer/hooks/agent/useLoadedSkills';
import { Message } from '@arco-design/web-react';
import { Lightning } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';
import GroupedItemList from './GroupedItemList';

type SkillsListProps = {
  t: TFunction;
  workspace?: string;
};

/**
 * Agent → Skills tab (ADR-0003): skills grouped by file-path root (User /
 * Project, mirroring the MCP tab's location grouping), each row showing its
 * 4-state enable-status. Clicking a row cycles the state and persists it to
 * `.claude/settings.local.json`, like the Claude Code CLI's `/skills`.
 */
const SkillsList: React.FC<SkillsListProps> = ({ t, workspace }) => {
  const { user, project, cycle } = useLoadedSkills(workspace);

  // Remap the two location buckets into GroupedItemList's shared shape (same
  // read-buckets→remap pattern McpServersList uses).
  const groups: SkillGroups = {
    global: user,
    profiles: project.length > 0 ? [{ name: t('conversation.workspace.skills.projectSection'), skills: project }] : [],
  };

  const stateLabels: Record<SkillState, string> = {
    on: t('conversation.workspace.skills.state.on'),
    'name-only': t('conversation.workspace.skills.state.nameOnly'),
    'user-only': t('conversation.workspace.skills.state.userOnly'),
    off: t('conversation.workspace.skills.state.off'),
  };

  const onCycle = (item: SkillItem) => {
    // Refused write (unparseable settings) surfaces instead of silently failing.
    cycle(item).catch(() => Message.error(t('conversation.workspace.skills.writeFailed')));
  };

  return (
    <GroupedItemList
      groups={groups}
      icon={<Lightning theme='outline' size={14} strokeWidth={2.5} />}
      globalLabel={t('conversation.workspace.skills.userSection')}
      searchPlaceholder={t('conversation.workspace.skills.search')}
      emptyText={t('conversation.workspace.skills.empty')}
      storageKey='agora-skills-collapsed'
      itemPrefix=''
      clickToFill={false}
      onCycle={onCycle}
      stateLabels={stateLabels}
    />
  );
};

export default SkillsList;
