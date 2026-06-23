/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPeerTask } from '@/common/adapter/ipcBridge';

// Regression guard for the scheduled-task "run now" white-screen crash:
// the run button was a bare <PlayOne> icon-park function component placed
// directly as an Arco <Tooltip> child. icon-park icons do not forwardRef, so on
// hover the Tooltip could not resolve a trigger DOM node and the popup mount
// threw — unmounting the whole renderer (no error boundary). The fix wraps the
// icon in a ref-able <span>, matching the page's other Tooltip children.

// Hoisted so the (hoisted) vi.mock factories below can reference the fixture.
const { peerTask, runNowMock } = vi.hoisted(() => ({
  peerTask: {
    id: 'pt-1',
    name: 'Nightly digest',
    prompt: 'summarise',
    managed_key: 'conv-1',
    peer_label: 'codex · ~/SecondBrain',
    frequency: 'daily',
    time: '09:00',
    enabled: true,
    next_run_at_ms: undefined,
    created_at: 0,
    updated_at: 0,
  } as IPeerTask,
  runNowMock: vi.fn().mockResolvedValue({ status: 'sent' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('swr', () => ({
  default: () => ({ data: [peerTask], mutate: vi.fn() }),
}));

vi.mock('@renderer/hooks/context/LayoutContext', () => ({
  useLayoutContext: () => ({ isMobile: false }),
}));

vi.mock('@renderer/pages/cron/useCronJobs', () => ({
  useAllCronJobs: () => ({ jobs: [], loading: false, pauseJob: vi.fn(), resumeJob: vi.fn() }),
}));

vi.mock('@renderer/pages/conversation/hooks/useConversationAgents', () => ({
  useConversationAgents: () => ({ cliAgents: [], presetAssistants: [] }),
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    peerTask: {
      list: { invoke: vi.fn().mockResolvedValue([peerTask]) },
      runNow: { invoke: (...args: unknown[]) => runNowMock(...args) },
      update: { invoke: vi.fn() },
      remove: { invoke: vi.fn() },
    },
  },
}));

vi.mock('@/common/config/configService', () => ({
  configService: { get: () => false, setLocal: vi.fn() },
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  systemSettings: { setKeepAwake: { invoke: vi.fn() } },
}));

// CreateTaskDialog is heavy and irrelevant to the run-button surface.
vi.mock('@renderer/pages/cron/ScheduledTasksPage/CreateTaskDialog', () => ({
  default: () => null,
}));

import ScheduledTasksPage from '@/renderer/pages/cron/ScheduledTasksPage';

describe('ScheduledTasksPage run-now button', () => {
  beforeEach(() => {
    runNowMock.mockClear();
  });

  /** The peer task row renders, proving the page mounted with our fixture. */
  it('renders the peer task row', async () => {
    render(<ScheduledTasksPage />);
    expect(await screen.findByText('Nightly digest')).toBeTruthy();
  });

  /**
   * The run button's Tooltip must wrap a ref-able DOM node. icon-park icons are
   * function components that don't forwardRef, so placing `<PlayOne>` directly in
   * an Arco `<Tooltip>` leaves Trigger unable to resolve a DOM ref — it falls
   * back to React.findDOMNode → undefined node → getBoundingClientRect throw →
   * whole-renderer white-screen at runtime (jsdom only warns, can't reproduce the
   * throw). The fix wraps the icon in an intermediate `<span>` (matching the
   * page's other Tooltip children), so the icon-park `.i-icon-play-one` element is
   * NOT the Tooltip's direct child. Guard: its DOM parent is the wrapper span, not
   * the bare action container — a revert (icon back as direct child) fails here.
   */
  it('wraps the run icon in a ref-able element so the Tooltip can resolve a ref', async () => {
    render(<ScheduledTasksPage />);
    await screen.findByText('Nightly digest');

    const playIcon = document.querySelector('.i-icon-play-one');
    expect(playIcon).toBeTruthy();
    // Wrapper span present → Arco Trigger gets a real DOM ref (no findDOMNode crash).
    expect(playIcon!.parentElement?.tagName).toBe('SPAN');
  });
});
