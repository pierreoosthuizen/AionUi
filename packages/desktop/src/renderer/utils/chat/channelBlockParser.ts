/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a parsed <channel> XML block embedded in message text.
 */
export type ChannelBlock = {
  /** The channel source (e.g. "claude-peers") */
  source: string;
  /** Peer ID that sent the message */
  fromId: string;
  /** ISO 8601 timestamp when the message was sent */
  sentAt: string;
  /** The inner message body */
  body: string;
};

/**
 * Regular expression that matches a complete <channel ...>...</channel> block.
 * Captures:
 *   1 – attribute string
 *   2 – inner body
 */
const CHANNEL_TAG_RE = /<channel\b([^>]*)>([\s\S]*?)<\/channel\s*>/gi;

/** Extract a named XML attribute value from an attribute string. Returns '' on miss. */
function extractAttr(attrs: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i');
  const m = attrs.match(re);
  return m?.[1] ?? '';
}

/**
 * Check if content contains one or more <channel> blocks.
 */
export function hasChannelBlocks(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  CHANNEL_TAG_RE.lastIndex = 0;
  return CHANNEL_TAG_RE.test(content);
}

/**
 * Parse all <channel> blocks from the given text content.
 * Returns an empty array when none are found.
 */
export function parseChannelBlocks(content: string): ChannelBlock[] {
  if (!content || typeof content !== 'string') return [];

  const blocks: ChannelBlock[] = [];
  CHANNEL_TAG_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CHANNEL_TAG_RE.exec(content)) !== null) {
    const attrs = match[1];
    const body = match[2];
    blocks.push({
      source: extractAttr(attrs, 'source') || 'unknown',
      fromId: extractAttr(attrs, 'from_id') || 'unknown',
      sentAt: extractAttr(attrs, 'sent_at') || '',
      body: body.trim(),
    });
  }

  return blocks;
}

/**
 * Strip all <channel> blocks from the given text content for clean markdown rendering.
 * Preserves surrounding text; collapses any resulting triple-newlines to double.
 */
export function stripChannelBlocks(content: string): string {
  if (!content || typeof content !== 'string') return content;
  CHANNEL_TAG_RE.lastIndex = 0;
  return content
    .replace(CHANNEL_TAG_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
