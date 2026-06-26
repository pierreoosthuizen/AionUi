/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@arco-design/web-react', () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Radio: Object.assign(
    ({ children, value }: { children: React.ReactNode; value: string }) => (
      <button data-value={value}>{children}</button>
    ),
    {
      Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }
  ),
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, {
    TabPane: ({ title }: { title: React.ReactNode }) => <div>{title}</div>,
  }),
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  ),
}));

vi.mock('@icon-park/react', () => ({
  BranchOne: () => <span>branch</span>,
  Refresh: ({ onClick }: { onClick?: () => void }) => (
    <button data-testid='refresh-icon' onClick={onClick}>
      refresh
    </button>
  ),
}));

import WorkspaceTabBar from '@/renderer/pages/conversation/Workspace/components/WorkspaceTabBar';

const t = (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key;

describe('WorkspaceTabBar refresh icon (ADR-0014)', () => {
  /** Refresh icon appears in the agent section when onAgentRefresh is provided. */
  it('renders the Refresh icon when section is agent and onAgentRefresh is provided', () => {
    const onAgentRefresh = vi.fn();
    render(
      <WorkspaceTabBar
        t={t}
        section='agent'
        onSectionChange={vi.fn()}
        activeTab='skills'
        onTabChange={vi.fn()}
        changeCount={0}
        branch={null}
        onAgentRefresh={onAgentRefresh}
      />
    );
    expect(screen.getByTestId('refresh-icon')).toBeDefined();
  });

  /** Refresh icon is absent in the project section — project refresh lives in WorkspaceToolbar. */
  it('does not render the Refresh icon when section is project', () => {
    render(
      <WorkspaceTabBar
        t={t}
        section='project'
        onSectionChange={vi.fn()}
        activeTab='files'
        onTabChange={vi.fn()}
        changeCount={0}
        branch={null}
        onAgentRefresh={vi.fn()}
      />
    );
    expect(screen.queryByTestId('refresh-icon')).toBeNull();
  });

  /** Clicking the icon calls onAgentRefresh. */
  it('calls onAgentRefresh when the Refresh icon is clicked', () => {
    const onAgentRefresh = vi.fn();
    render(
      <WorkspaceTabBar
        t={t}
        section='agent'
        onSectionChange={vi.fn()}
        activeTab='skills'
        onTabChange={vi.fn()}
        changeCount={0}
        branch={null}
        onAgentRefresh={onAgentRefresh}
      />
    );
    fireEvent.click(screen.getByTestId('refresh-icon'));
    expect(onAgentRefresh).toHaveBeenCalledOnce();
  });
});
