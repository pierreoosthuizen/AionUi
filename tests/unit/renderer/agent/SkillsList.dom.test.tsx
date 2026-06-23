/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { SkillItem } from '@/renderer/hooks/agent/useLoadedSkills';

// ADR-0003 §3/§5: the Skills tab renders location buckets + a state glyph per
// row, and a click cycles the state. The hook is mocked; GroupedItemList/ItemRow
// render for real, so this exercises the glyph + click-cycle wiring end to end.

const { cycleMock } = vi.hoisted(() => ({ cycleMock: vi.fn().mockResolvedValue(undefined) }));

const userSkill: SkillItem = { name: 'user-skill', description: 'a user skill', location: 'user', state: 'on' };
const projectSkill: SkillItem = {
  name: 'project-skill',
  description: 'a project skill',
  location: 'project',
  state: 'off',
};

vi.mock('@/renderer/hooks/agent/useLoadedSkills', () => ({
  useLoadedSkills: () => ({ user: [userSkill], project: [projectSkill], cycle: cycleMock }),
}));

import SkillsList from '@/renderer/pages/conversation/Workspace/components/SkillsList';

// t passthrough: returns the key so we can assert on key strings.
const t = ((key: string) => key) as unknown as TFunction;

describe('SkillsList', () => {
  /** Both location buckets render: User (global) section + a Project section. */
  it('renders user and project location sections', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    expect(screen.getByText('conversation.workspace.skills.userSection')).toBeTruthy();
    expect(screen.getByText('conversation.workspace.skills.projectSection')).toBeTruthy();
    expect(screen.getByText('user-skill')).toBeTruthy();
    expect(screen.getByText('project-skill')).toBeTruthy();
  });

  /** Each skill row shows a state glyph (on = ●, off = ○). */
  it('renders a state glyph per skill row', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    expect(screen.getByText('●')).toBeTruthy(); // on
    expect(screen.getByText('○')).toBeTruthy(); // off
  });

  /** Clicking a skill row cycles its state via the hook. */
  it('cycles state on row click', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    fireEvent.click(screen.getByText('user-skill'));
    expect(cycleMock).toHaveBeenCalledWith(userSkill);
  });
});
