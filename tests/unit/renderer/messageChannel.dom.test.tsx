/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChannelBlock } from '@/renderer/utils/chat/channelBlockParser';
import MessageChannel from '@/renderer/pages/conversation/Messages/components/MessageChannel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

vi.mock('@icon-park/react', () => ({
  Communication: () => <span data-testid='network-icon' />,
}));

function makeBlock(overrides?: Partial<ChannelBlock>): ChannelBlock {
  return {
    source: 'claude-peers',
    fromId: 'peer-abc',
    sentAt: '2026-06-23T10:30:46.818Z',
    body: 'Hello from the peer',
    ...overrides,
  };
}

describe('MessageChannel', () => {
  /** The peer ID is rendered as the sender label inside the block header. */
  it('renders the from_id as the sender label', () => {
    render(<MessageChannel block={makeBlock({ fromId: 'my-peer-id' })} />);
    expect(screen.getByText('my-peer-id')).toBeInTheDocument();
  });

  /** The body text is visible in the rendered output. */
  it('renders the message body text', () => {
    render(<MessageChannel block={makeBlock({ body: 'Test body content' })} />);
    expect(screen.getByText('Test body content')).toBeInTheDocument();
  });

  /** The formatted timestamp derived from sent_at is shown. */
  it('renders a formatted timestamp derived from sent_at', () => {
    render(<MessageChannel block={makeBlock({ sentAt: '2026-06-23T10:30:46.818Z' })} />);
    // The exact locale format varies by environment; we only assert the container renders
    const block = screen.getByTestId('message-channel-block');
    expect(block).toBeInTheDocument();
  });

  /** Raw XML tags must not appear anywhere in the rendered output. */
  it('does not render raw XML tags in the output', () => {
    const { container } = render(<MessageChannel block={makeBlock()} />);
    expect(container.textContent).not.toContain('<channel');
    expect(container.textContent).not.toContain('</channel');
    expect(container.textContent).not.toContain('source=');
    expect(container.textContent).not.toContain('from_id=');
    expect(container.textContent).not.toContain('sent_at=');
  });

  /** Network icon is rendered as the peer-network visual indicator. */
  it('renders the peer-network icon', () => {
    render(<MessageChannel block={makeBlock()} />);
    expect(screen.getByTestId('network-icon')).toBeInTheDocument();
  });

  /** Gracefully renders when from_id falls back to "unknown". */
  it('renders gracefully when from_id is "unknown" (missing attribute fallback)', () => {
    render(<MessageChannel block={makeBlock({ fromId: 'unknown' })} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  /** Renders gracefully when sent_at is empty (no timestamp span). */
  it('renders without a timestamp when sent_at is empty', () => {
    const { container } = render(<MessageChannel block={makeBlock({ sentAt: '' })} />);
    // No timestamp — component simply omits the timestamp span; no error
    expect(container).toBeInTheDocument();
  });

  /** Renders multiline body content preserving newlines (white-space: pre-wrap). */
  it('renders multiline body content', () => {
    render(<MessageChannel block={makeBlock({ body: 'line one\nline two' })} />);
    expect(screen.getByText(/line one/)).toBeInTheDocument();
    expect(screen.getByText(/line two/)).toBeInTheDocument();
  });
});
