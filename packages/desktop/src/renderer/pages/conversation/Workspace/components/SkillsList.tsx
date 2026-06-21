/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLoadedSkills } from '@/renderer/hooks/agent/useLoadedSkills';
import { emitter } from '@/renderer/utils/emitter';
import { Empty } from '@arco-design/web-react';
import { Lightning } from '@icon-park/react';
import type { TFunction } from 'i18next';
import React, { useMemo, useState } from 'react';

type SkillsListProps = {
  t: TFunction;
  workspace?: string;
};

/**
 * Skills tab for the Project panel: lists the skills the embedded agent
 * actually loaded (user + project `.claude/skills`). Clicking a skill drops
 * `/name ` into the sendbox.
 */
const SkillsList: React.FC<SkillsListProps> = ({ t, workspace }) => {
  const skills = useLoadedSkills(workspace);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? skills.filter((s) => s.toLowerCase().includes(q)) : skills;
  }, [skills, query]);

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
      {filtered.length === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <Empty description={t('conversation.workspace.skills.empty', { defaultValue: 'No skills loaded' })} />
        </div>
      ) : (
        <div className='flex-1 overflow-y-auto px-6px pb-8px'>
          {filtered.map((name) => (
            <div
              key={name}
              className='flex items-center gap-8px px-10px py-7px rd-6px cursor-pointer hover:bg-fill-2 text-13px text-t-primary'
              title={`/${name}`}
              onClick={() => emitter.emit('sendbox.fill', `/${name} `)}
            >
              <Lightning theme='outline' size={14} strokeWidth={2.5} className='shrink-0 text-t-secondary' />
              <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillsList;
