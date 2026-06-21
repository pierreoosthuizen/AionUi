/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLoadedSkills } from '@/renderer/hooks/agent/useLoadedSkills';
import { Lightning } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';
import GroupedItemList from './GroupedItemList';

type SkillsListProps = {
  t: TFunction;
  workspace?: string;
};

/** Agent → Skills tab: skills the embedded agent loaded, grouped by origin. */
const SkillsList: React.FC<SkillsListProps> = ({ t, workspace }) => (
  <GroupedItemList
    groups={useLoadedSkills(workspace)}
    icon={<Lightning theme='outline' size={14} strokeWidth={2.5} />}
    globalLabel={t('conversation.workspace.skills.globalSection', { defaultValue: 'Global' })}
    searchPlaceholder={t('conversation.workspace.skills.search', { defaultValue: 'Search skills…' })}
    emptyText={t('conversation.workspace.skills.empty', { defaultValue: 'No skills loaded' })}
  />
);

export default SkillsList;
