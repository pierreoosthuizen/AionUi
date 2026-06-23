/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SkillGroups, SkillItem, SkillState } from '@/renderer/hooks/agent/useLoadedSkills';
import { emitter } from '@/renderer/utils/emitter';
import { Empty } from '@arco-design/web-react';
import { Down, Right } from '@icon-park/react';
import React, { useMemo, useState } from 'react';

// ADR-0003 §5: a skill row carries `state`, so it renders a state glyph and the
// click cycles enable-state instead of filling the sendbox. Glyph + colour per
// state; the localized name is the hover title (stateLabels, passed from above).
const STATE_GLYPH: Record<SkillState, { glyph: string; className: string }> = {
  on: { glyph: '●', className: 'text-[rgb(var(--green-6))]' },
  'name-only': { glyph: '◐', className: 'text-[rgb(var(--orange-6))]' },
  'user-only': { glyph: '◑', className: 'text-[rgb(var(--arcoblue-6))]' },
  off: { glyph: '○', className: 'text-t-tertiary' },
};

type GroupedItemListProps = {
  groups: SkillGroups;
  /** Per-row leading icon (skills vs commands). */
  icon: React.ReactNode;
  globalLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  /** localStorage key under which the collapsed-folder set is persisted. */
  storageKey: string;
  /** Leading char in row tooltip / fill (default `/` for slash-commands). */
  itemPrefix?: string;
  /** Click a row to drop `/name ` into the sendbox (default true). MCP rows are
   *  read-only info, so they pass false. */
  clickToFill?: boolean;
  /** Skills only: advance a row's enable-state on click (overrides clickToFill
   *  when the item carries a `state`). */
  onCycle?: (item: SkillItem) => void;
  /** Skills only: localized label per state for the glyph's hover title. */
  stateLabels?: Record<SkillState, string>;
};

function loadCollapsed(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

const ItemRow: React.FC<{
  item: SkillItem;
  icon: React.ReactNode;
  prefix: string;
  clickToFill: boolean;
  onCycle?: (item: SkillItem) => void;
  stateLabels?: Record<SkillState, string>;
}> = ({ item, icon, prefix, clickToFill, onCycle, stateLabels }) => {
  const isSkill = item.state !== undefined;
  // Skills cycle on click (unless plugin-locked); everything else keeps the
  // existing sendbox-fill behaviour. A skill row never fills the sendbox.
  const clickable = isSkill ? !item.locked : clickToFill;
  const handleClick = isSkill
    ? item.locked
      ? undefined
      : () => onCycle?.(item)
    : clickToFill
      ? () => emitter.emit('sendbox.fill', `${prefix}${item.name} `)
      : undefined;
  const glyph = isSkill ? STATE_GLYPH[item.state as SkillState] : null;

  return (
    <div
      className={`flex items-center gap-8px pl-24px pr-10px py-7px rd-6px hover:bg-fill-2 text-13px text-t-primary ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      title={item.description ? `${prefix}${item.name} — ${item.description}` : `${prefix}${item.name}`}
      onClick={handleClick}
    >
      <span className='shrink-0 text-t-secondary flex items-center'>{icon}</span>
      <span className='overflow-hidden text-ellipsis whitespace-nowrap flex-1'>{item.name}</span>
      {glyph && (
        <span
          className={`shrink-0 text-12px leading-none ${glyph.className}`}
          title={stateLabels?.[item.state as SkillState]}
        >
          {glyph.glyph}
        </span>
      )}
    </div>
  );
};

/**
 * Collapsible folder list shared by the Skills and Commands tabs: a "Global"
 * folder first, then one folder per applied profile. Search filters by name +
 * description and auto-expands matches. Clicking a row drops `/name ` into the
 * sendbox.
 */
const GroupedItemList: React.FC<GroupedItemListProps> = ({
  groups,
  icon,
  globalLabel,
  searchPlaceholder,
  emptyText,
  storageKey,
  itemPrefix = '/',
  clickToFill = true,
  onCycle,
  stateLabels,
}) => {
  const { global, profiles } = groups;
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed(storageKey));

  const q = query.trim().toLowerCase();
  const match = useMemo(
    () => (s: SkillItem) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    [q]
  );

  const nodes = useMemo(() => {
    const list: Array<{ key: string; label: string; skills: SkillItem[] }> = [];
    const globalFiltered = global.filter(match);
    if (globalFiltered.length > 0) list.push({ key: '__global__', label: globalLabel, skills: globalFiltered });
    for (const p of profiles) {
      const skills = p.skills.filter(match);
      if (skills.length > 0) list.push({ key: `p:${p.name}`, label: p.name, skills });
    }
    return list;
  }, [global, profiles, match, globalLabel]);

  const total = nodes.reduce((n, node) => n + node.skills.length, 0);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore quota/availability errors — collapse state is non-critical */
      }
      return next;
    });

  return (
    <div className='flex flex-col h-full min-h-0'>
      <div className='px-12px pt-8px pb-6px'>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className='w-full h-28px px-10px rd-6px text-13px bg-fill-2 text-t-primary outline-none border border-transparent focus:border-[rgb(var(--primary-6))]'
        />
      </div>
      {total === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <Empty description={emptyText} />
        </div>
      ) : (
        <div className='flex-1 overflow-y-auto px-6px pb-8px'>
          {nodes.map((node) => {
            const isCollapsed = !q && collapsed.has(node.key);
            return (
              <div key={node.key}>
                <div
                  className='flex items-center gap-6px px-8px py-7px mt-2px rd-6px cursor-pointer hover:bg-fill-2 text-13px font-600 text-t-primary'
                  onClick={() => toggle(node.key)}
                >
                  {isCollapsed ? (
                    <Right theme='outline' size={14} strokeWidth={3} className='shrink-0 text-t-tertiary' />
                  ) : (
                    <Down theme='outline' size={14} strokeWidth={3} className='shrink-0 text-t-tertiary' />
                  )}
                  <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{node.label}</span>
                  <span className='ml-auto text-11px font-400 text-t-tertiary'>{node.skills.length}</span>
                </div>
                {!isCollapsed &&
                  node.skills.map((item) => (
                    <ItemRow
                      key={`${node.key}:${item.name}`}
                      item={item}
                      icon={icon}
                      prefix={itemPrefix}
                      clickToFill={clickToFill}
                      onCycle={onCycle}
                      stateLabels={stateLabels}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupedItemList;
