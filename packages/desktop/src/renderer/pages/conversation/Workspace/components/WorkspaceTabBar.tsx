/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dropdown, Radio, Tabs, Tooltip } from '@arco-design/web-react';
import { BranchOne, Refresh } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React from 'react';
import type { WorkspaceSection, WorkspaceTab } from '../types';

type WorkspaceTabBarProps = {
  t: TFunction;
  section: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  changeCount: number;
  branch: string | null;
  onAgentRefresh?: () => void;
};

const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  t,
  section,
  onSectionChange,
  activeTab,
  onTabChange,
  changeCount,
  branch,
  onAgentRefresh,
}) => {
  const changesTitle = (
    <span className='flex items-center'>
      {t('conversation.workspace.changes.tab')}
      {changeCount > 0 && <span className='ml-2px text-t-tertiary'>({changeCount > 99 ? '99+' : changeCount})</span>}
    </span>
  );

  const branchIcon = (
    <span className='flex items-center text-t-tertiary mx-8px hover:text-t-secondary transition-colors cursor-pointer'>
      <BranchOne size={16} className='shrink-0' />
    </span>
  );

  // Branches are read-only (no checkout support yet) — clicking the icon
  // surfaces just the current branch name instead of an unactionable list.
  const branchDropdown = branch ? (
    <Dropdown
      trigger='click'
      position='bl'
      droplist={
        <div
          className='rounded-6px px-12px py-8px shadow-lg text-12px text-t-primary'
          style={{
            maxWidth: 320,
            background: 'var(--color-bg-popup)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className='text-t-tertiary mb-2px'>{t('conversation.workspace.changes.currentBranchLabel')}</div>
          <div className='font-medium break-all'>{branch}</div>
        </div>
      }
    >
      {branchIcon}
    </Dropdown>
  ) : null;

  return (
    <div className='flex flex-col'>
      {/* Section switcher: Project (files) vs Agent (skills/commands/mcp/plugins) */}
      <div className='px-12px pt-8px flex items-center gap-8px'>
        <Radio.Group
          type='button'
          size='small'
          value={section}
          onChange={(value) => onSectionChange(value as WorkspaceSection)}
        >
          <Radio value='project'>{t('conversation.workspace.section.project', { defaultValue: 'Project' })}</Radio>
          <Radio value='agent'>{t('conversation.workspace.section.agent', { defaultValue: 'Agent' })}</Radio>
        </Radio.Group>
        {section === 'agent' && onAgentRefresh && (
          <Tooltip content={t('conversation.workspace.agent.refresh', { defaultValue: 'Refresh' })}>
            <span>
              <Refresh theme='outline' size={14} onClick={onAgentRefresh} style={{ cursor: 'pointer' }} />
            </span>
          </Tooltip>
        )}
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(key) => onTabChange(key as WorkspaceTab)}
        type='line'
        size='small'
        className='px-12px [&_.arco-tabs-nav]:border-b-0 [&_.arco-tabs-header-title]:!mr-8px'
        extra={section === 'project' ? branchDropdown : null}
      >
        {section === 'project'
          ? [
              <Tabs.TabPane key='files' title={t('conversation.workspace.changes.filesTab')} />,
              <Tabs.TabPane key='changes' title={changesTitle} />,
            ]
          : [
              <Tabs.TabPane key='skills' title={t('conversation.workspace.skills.tab', { defaultValue: 'Skills' })} />,
              <Tabs.TabPane
                key='commands'
                title={t('conversation.workspace.commands.tab', { defaultValue: 'Commands' })}
              />,
              <Tabs.TabPane key='mcp' title={t('conversation.workspace.mcp.tab', { defaultValue: 'MCP' })} />,
              <Tabs.TabPane
                key='plugins'
                title={t('conversation.workspace.plugins.tab', { defaultValue: 'Plugins' })}
              />,
            ]}
      </Tabs>
    </div>
  );
};

export default WorkspaceTabBar;
