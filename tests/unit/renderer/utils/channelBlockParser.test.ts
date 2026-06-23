/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { hasChannelBlocks, parseChannelBlocks, stripChannelBlocks } from '@/renderer/utils/chat/channelBlockParser';

describe('channelBlockParser', () => {
  describe('hasChannelBlocks', () => {
    /** Detects a well-formed <channel> tag. */
    it('returns true for content containing a <channel> block', () => {
      const content =
        '<channel source="claude-peers" from_id="peer-1" sent_at="2026-06-23T10:00:00.000Z">hello</channel>';
      expect(hasChannelBlocks(content)).toBe(true);
    });

    /** Returns false when there is no <channel> block at all. */
    it('returns false for plain text without a <channel> block', () => {
      expect(hasChannelBlocks('Normal message text')).toBe(false);
    });

    /** Handles empty / falsy inputs without throwing. */
    it('returns false for empty string', () => {
      expect(hasChannelBlocks('')).toBe(false);
    });

    /** Ignores non-channel XML-like tags. */
    it('returns false for unrelated tags', () => {
      expect(hasChannelBlocks('<thinking>some thought</thinking>')).toBe(false);
    });
  });

  describe('parseChannelBlocks', () => {
    /** Extracts all three attributes from a single complete block. */
    it('parses source, from_id, and sent_at attributes from a single block', () => {
      const xml =
        '<channel source="claude-peers" from_id="abc123" sent_at="2026-06-23T10:30:46.818Z">message body</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        source: 'claude-peers',
        fromId: 'abc123',
        sentAt: '2026-06-23T10:30:46.818Z',
        body: 'message body',
      });
    });

    /** Extracts multiple blocks from a single string. */
    it('parses multiple <channel> blocks', () => {
      const xml =
        '<channel source="s1" from_id="peer-a" sent_at="2026-01-01T00:00:00.000Z">first</channel>' +
        '<channel source="s2" from_id="peer-b" sent_at="2026-01-02T00:00:00.000Z">second</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].fromId).toBe('peer-a');
      expect(blocks[1].fromId).toBe('peer-b');
    });

    /** Returns empty array when input has no <channel> blocks. */
    it('returns an empty array when there are no <channel> blocks', () => {
      expect(parseChannelBlocks('Just plain text')).toEqual([]);
    });

    /** Trims surrounding whitespace from the body. */
    it('trims leading and trailing whitespace from the body', () => {
      const xml = '<channel source="s" from_id="p" sent_at="">\n  trimmed  \n</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks[0].body).toBe('trimmed');
    });

    /** Gracefully handles a missing from_id attribute — falls back to "unknown". */
    it('falls back to "unknown" when from_id attribute is missing', () => {
      const xml = '<channel source="claude-peers" sent_at="2026-06-23T10:00:00.000Z">body</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks[0].fromId).toBe('unknown');
    });

    /** Gracefully handles a missing sent_at attribute — falls back to "". */
    it('falls back to empty string when sent_at attribute is missing', () => {
      const xml = '<channel source="claude-peers" from_id="p">body</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks[0].sentAt).toBe('');
    });

    /** Does not crash on unknown extra attributes; ignores them. */
    it('ignores unknown attributes without throwing', () => {
      const xml = '<channel source="s" from_id="p" sent_at="t" unknown_attr="x">body</channel>';
      expect(() => parseChannelBlocks(xml)).not.toThrow();
      const blocks = parseChannelBlocks(xml);
      expect(blocks[0].fromId).toBe('p');
    });

    /** Returns empty array for empty or falsy input. */
    it('returns empty array for empty string', () => {
      expect(parseChannelBlocks('')).toEqual([]);
    });

    /** Preserves multiline body content. */
    it('preserves newlines in multi-line body content', () => {
      const xml = '<channel source="s" from_id="p" sent_at="">\nline one\nline two\n</channel>';
      const blocks = parseChannelBlocks(xml);
      expect(blocks[0].body).toContain('line one');
      expect(blocks[0].body).toContain('line two');
    });
  });

  describe('stripChannelBlocks', () => {
    /** Removes a <channel> block and leaves surrounding text intact. */
    it('removes a <channel> block while preserving surrounding text', () => {
      const content = 'Before\n<channel source="s" from_id="p" sent_at="">msg</channel>\nAfter';
      const result = stripChannelBlocks(content);
      expect(result).not.toContain('<channel');
      expect(result).not.toContain('</channel');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    /** Removes multiple blocks. */
    it('removes all <channel> blocks from the string', () => {
      const content =
        '<channel source="s" from_id="a" sent_at="">A</channel>' +
        ' middle ' +
        '<channel source="s" from_id="b" sent_at="">B</channel>';
      const result = stripChannelBlocks(content);
      expect(result).not.toContain('<channel');
      expect(result).toContain('middle');
    });

    /** Returns the original string when there are no blocks to strip. */
    it('returns original text unchanged when no <channel> blocks are present', () => {
      const content = 'Plain text without tags';
      expect(stripChannelBlocks(content)).toBe(content);
    });

    /** Returns the input for empty / falsy values without throwing. */
    it('handles empty string without throwing', () => {
      expect(stripChannelBlocks('')).toBe('');
    });
  });
});
