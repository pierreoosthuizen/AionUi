/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLoadedSkills } from '@/renderer/hooks/agent/useLoadedSkills';
import { emitter } from '@/renderer/utils/emitter';
import { Empty } from '@arco-design/web-react';
import { Down, Lightning, Right } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React, { useMemo, useState } from 'react';

type SkillsListProps = {
  t: TFunction;
  workspace?: string;
};

const SkillRow: React.FC<{ name: string; indent?: boolean }> = ({ name, indent }) => (
  <div
    className={`flex items-center gap-8px ${indent ? 'pl-24px pr-10px' : 'px-10px'} py-7px rd-6px cursor-pointer hover:bg-fill-2 text-13px text-t-primary`}
    title={`/${name}`}
    onClick={() => emitter.emit('sendbox.fill', `/${name} `)}
  >
    <Lightning theme='outline' size={14} strokeWidth={2.5} className='shrink-0 text-t-secondary' />
    <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{name}</span>
  </div>
);

/**
 * Skills tab for the Project panel: lists the skills the embedded agent actually
 * loaded, grouped by origin — global skills first, then one collapsible node per
 * applied profile. Clicking a skill drops `/name ` into the sendbox.
 */
const SkillsList: React.FC<SkillsListProps> = ({ t, workspace }) => {
  const { global, profiles } = useLoadedSkills(workspace);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const match = useMemo(() => (s: string) => !q || s.toLowerCase().includes(q), [q]);

  const globalFiltered = useMemo(() => global.filter(match), [global, match]);
  const profilesFiltered = useMemo(
    () => profiles.map((p) => ({ name: p.name, skills: p.skills.filter(match) })).filter((p) => p.skills.length > 0),
    [profiles, match]
  );

  const total = globalFiltered.length + profilesFiltered.reduce((n, p) => n + p.skills.length, 0);
  const hasProfiles = profilesFiltered.length > 0;

  const toggle = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className='flex flex-col h-full min-h-0'>
      <div className='px-12px pt-8px pb-6px'>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('conversation.workspace.skills.search', { defaultValue: 'Search skills…' })}
          className='w-full h-28px px-10px rd-6px text-13px bg-fill-2 text-t-primary outline-none border border-transparent focus:border-[rgb(var(--primary-6))]'
        />
      </div>
      {total === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <Empty description={t('conversation.workspace.skills.empty', { defaultValue: 'No skills loaded' })} />
        </div>
      ) : (
        <div className='flex-1 overflow-y-auto px-6px pb-8px'>
          {/* Global group — labelled only when profiles also exist, else a plain flat list. */}
          {hasProfiles && globalFiltered.length > 0 && (
            <div className='px-10px pt-6px pb-2px text-11px font-600 uppercase tracking-wide text-t-tertiary'>
              {t('conversation.workspace.skills.globalSection', { defaultValue: 'Global' })}
            </div>
          )}
          {globalFiltered.map((name) => (
            <SkillRow key={`g:${name}`} name={name} indent={hasProfiles} />
          ))}

          {/* One collapsible node per applied profile. Search expands all matches. */}
          {profilesFiltered.map((profile) => {
            const isCollapsed = !q && collapsed.has(profile.name);
            return (
              <div key={`p:${profile.name}`}>
                <div
                  className='flex items-center gap-6px px-8px py-7px mt-2px rd-6px cursor-pointer hover:bg-fill-2 text-13px font-600 text-t-primary'
                  onClick={() => toggle(profile.name)}
                >
                  {isCollapsed ? (
                    <Right theme='outline' size={14} strokeWidth={3} className='shrink-0 text-t-tertiary' />
                  ) : (
                    <Down theme='outline' size={14} strokeWidth={3} className='shrink-0 text-t-tertiary' />
                  )}
                  <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{profile.name}</span>
                  <span className='ml-auto text-11px font-400 text-t-tertiary'>{profile.skills.length}</span>
                </div>
                {!isCollapsed &&
                  profile.skills.map((name) => <SkillRow key={`${profile.name}:${name}`} name={name} indent />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillsList;
