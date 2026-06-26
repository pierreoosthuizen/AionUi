/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// REQ-027: the show/hide control cycles all → hide-off → all. In hide-off mode
// rows whose resolved state is 'off' (skillOverrides[name] === 'off') drop out;
// the refresh control clears the scan cache. useLoadedSkills is mocked so the
// skill set — including one disabled skill — is deterministic.

const { clearSkillScanCacheMock, cycleMock } = vi.hoisted(() => ({
  clearSkillScanCacheMock: vi.fn(),
  cycleMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/renderer/hooks/agent/useLoadedSkills', () => ({
  useLoadedSkills: () => ({
    user: [
      { name: 'visible-skill', description: 'enabled', state: 'on', location: 'user' },
      { name: 'hidden-skill', description: 'disabled', state: 'off', location: 'user' },
    ],
    project: [],
    cycle: cycleMock,
  }),
  clearSkillScanCache: clearSkillScanCacheMock,
}));

import SkillsList from '@/renderer/pages/conversation/Workspace/components/SkillsList';

// Identity translator: returns the key, so assertions reference the raw i18n keys.
const t = ((key: string) => key) as unknown as TFunction;
const SHOWING_ALL = 'conversation.workspace.skills.filter.showingAll';
const HIDING_OFF = 'conversation.workspace.skills.filter.hidingOff';
const REFRESH = 'conversation.workspace.skills.refresh';

describe('SkillsList show/hide + refresh controls (REQ-027)', () => {
  /** Both controls render in the header row, defaulting to "showing all". */
  it('renders refresh and filter controls', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    expect(screen.getByLabelText(REFRESH)).toBeTruthy();
    expect(screen.getByLabelText(SHOWING_ALL)).toBeTruthy();
  });

  /** hide-off mode excludes 'off' skills and keeps the rest; the control relabels. */
  it('hides off-skills when toggled to hide-off', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    expect(screen.getByText('visible-skill')).toBeTruthy();
    expect(screen.getByText('hidden-skill')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(SHOWING_ALL));

    expect(screen.getByText('visible-skill')).toBeTruthy();
    expect(screen.queryByText('hidden-skill')).toBeNull();
    expect(screen.getByLabelText(HIDING_OFF)).toBeTruthy();
  });

  /** Toggling back to "all" restores the hidden skill. */
  it('cycles hide-off back to all', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    fireEvent.click(screen.getByLabelText(SHOWING_ALL));
    expect(screen.queryByText('hidden-skill')).toBeNull();
    fireEvent.click(screen.getByLabelText(HIDING_OFF));
    expect(screen.getByText('hidden-skill')).toBeTruthy();
  });

  /** The refresh control clears the per-session scan cache. */
  it('clears the scan cache on refresh', () => {
    render(<SkillsList t={t} workspace='/ws' />);
    fireEvent.click(screen.getByLabelText(REFRESH));
    expect(clearSkillScanCacheMock).toHaveBeenCalledTimes(1);
  });
});
