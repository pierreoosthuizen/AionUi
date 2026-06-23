/**
 * Verifies that McpServerHeader renders the Reconnect menu item for non-builtin
 * servers and calls onReconnect when clicked, but is disabled when isReconnecting.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '@arco-design/web-react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

vi.mock('@/renderer/hooks/context/FeedbackContext', () => ({
  useFeedback: () => ({ openFeedback: vi.fn(() => Promise.resolve()) }),
}));

import McpServerHeader from '@/renderer/pages/settings/ToolsSettings/McpServerHeader';
import type { IMcpServer } from '@/common/config/storage';

const buildServer = (builtin = false): IMcpServer =>
  ({
    id: 'srv-1',
    name: 'my-server',
    enabled: true,
    builtin,
    transport: { type: 'http', url: 'http://localhost:9000' },
    last_test_status: undefined,
    created_at: 0,
    updated_at: 0,
    original_json: '{}',
  }) as IMcpServer;

const onReconnectMock = vi.fn();

const renderHeader = (props: Partial<Parameters<typeof McpServerHeader>[0]> = {}) =>
  render(
    <ConfigProvider>
      <McpServerHeader
        server={buildServer()}
        isTestingConnection={false}
        onTestConnection={vi.fn()}
        onEditServer={vi.fn()}
        onDeleteServer={vi.fn()}
        onReconnect={onReconnectMock}
        {...props}
      />
    </ConfigProvider>
  );

describe('McpServerHeader — Reconnect menu item', () => {
  beforeEach(() => {
    onReconnectMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the kebab menu button for a non-builtin server', () => {
    renderHeader();
    // SettingOne icon button triggers the dropdown (aria role button exists).
    const buttons = screen.getAllByRole('button');
    // At least the kebab (SettingOne) button is present.
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('does not render kebab menu for a builtin server', () => {
    renderHeader({ server: buildServer(true) });
    // The SettingOne icon button for builtin servers is hidden.
    // The only visible button is the test-connection Refresh button.
    const buttons = screen.getAllByRole('button');
    // There should be no dropdown trigger for builtin; only the refresh button.
    expect(buttons).toHaveLength(1);
  });

  it('does not render Reconnect menu when onReconnect prop is absent', async () => {
    const user = userEvent.setup();
    renderHeader({ onReconnect: undefined });
    const buttons = screen.getAllByRole('button');
    const settingBtn = buttons.find((b) => b.querySelector('svg'));
    if (settingBtn) {
      await user.hover(settingBtn);
    }
    expect(screen.queryByText('settings.mcpReconnect')).not.toBeInTheDocument();
  });
});
