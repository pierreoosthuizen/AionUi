/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChannelBlock } from '@renderer/utils/chat/channelBlockParser';
import { Communication } from '@icon-park/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './MessageChannel.module.css';

/**
 * Format a sent_at ISO string for display.
 * Falls back to the raw string when parsing fails.
 */
function formatSentAt(sentAt: string): string {
  if (!sentAt) return '';
  try {
    return new Date(sentAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return sentAt;
  }
}

type MessageChannelProps = {
  block: ChannelBlock;
};

/**
 * Renders a single peer-channel message block extracted from a <channel> XML tag.
 * Displays the sender ID, formatted timestamp, and message body in a distinct styled container.
 */
const MessageChannel: React.FC<MessageChannelProps> = ({ block }) => {
  const { t } = useTranslation();
  const formattedTime = formatSentAt(block.sentAt);

  return (
    <div
      className={styles.container}
      aria-label={t('conversation.channel.ariaLabel', { defaultValue: 'Peer message' })}
      data-testid='message-channel-block'
    >
      <div className={styles.header}>
        <span className={styles.headerIcon} aria-hidden='true'>
          <Communication theme='outline' size='14' />
        </span>
        <span className={styles.fromId} title={block.fromId}>
          {block.fromId}
        </span>
        {formattedTime && (
          <span className={styles.timestamp} title={block.sentAt}>
            {formattedTime}
          </span>
        )}
      </div>
      <div className={styles.body}>{block.body}</div>
    </div>
  );
};

export default MessageChannel;
