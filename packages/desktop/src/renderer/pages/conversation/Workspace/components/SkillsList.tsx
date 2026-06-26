/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  clearSkillScanCache,
  useLoadedSkills,
  type SkillGroups,
  type SkillItem,
  type SkillState,
} from '@/renderer/hooks/agent/useLoadedSkills';
import { iconColors } from '@/renderer/styles/colors';
import { Message, Tooltip } from '@arco-design/web-react';
import { Lightning, PreviewClose, PreviewOpen, Refresh } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React, { useState } from 'react';
import GroupedItemList from './GroupedItemList';

/** Show every skill, or hide those toggled 'off'. Ephemeral — resets on mount. */
type FilterMode = 'all' | 'hide-off';

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
  // REQ-027: the refresh button bumps this nonce (after clearing the scan cache)
  // to force useLoadedSkills to re-scan; the filter is ephemeral, resetting here.
  const [skillsEpoch, setSkillsEpoch] = useState(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const { user, project, cycle } = useLoadedSkills(workspace, skillsEpoch);

  const refreshSkills = () => {
    clearSkillScanCache();
    setSkillsEpoch((e) => e + 1);
  };
  const toggleFilter = () => setFilterMode((m) => (m === 'all' ? 'hide-off' : 'all'));

  // hide-off drops skills whose resolved state is 'off' (skillOverrides[name] === 'off',
  // surfaced onto SkillItem.state by useLoadedSkills via stateFromLiteral). Skills with
  // no override entry resolve to 'on' and stay visible in both modes.
  const filter = filterMode === 'hide-off' ? (s: SkillItem) => s.state !== 'off' : undefined;

  const filterLabel =
    filterMode === 'all'
      ? t('conversation.workspace.skills.filter.showingAll')
      : t('conversation.workspace.skills.filter.hidingOff');

  const headerActions = (
    <>
      <Tooltip content={t('conversation.workspace.skills.refresh')}>
        <span
          aria-label={t('conversation.workspace.skills.refresh')}
          className='flex items-center cursor-pointer'
          onClick={refreshSkills}
        >
          <Refresh theme='outline' size={16} fill={iconColors.secondary} />
        </span>
      </Tooltip>
      <Tooltip content={filterLabel}>
        <span aria-label={filterLabel} className='flex items-center cursor-pointer' onClick={toggleFilter}>
          {filterMode === 'all' ? (
            <PreviewOpen theme='outline' size={16} fill={iconColors.secondary} />
          ) : (
            <PreviewClose theme='outline' size={16} fill={iconColors.secondary} />
          )}
        </span>
      </Tooltip>
    </>
  );

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
      headerActions={headerActions}
      filter={filter}
    />
  );
};

export default SkillsList;
