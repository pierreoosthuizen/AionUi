/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import type { ReactNode } from 'react';
import type { ChatGroup } from './hooks/useGroups';

export type WorkspaceGroup = {
  workspace: string;
  display_name: string;
  conversations: TChatConversation[];
};

export type TimelineItem = {
  type: 'workspace' | 'conversation';
  time: number;
  workspaceGroup?: WorkspaceGroup;
  conversation?: TChatConversation;
};

export type TimelineSection = {
  timeline: string;
  items: TimelineItem[];
};

export type GroupedHistoryResult = {
  pinnedConversations: TChatConversation[];
  timelineSections: TimelineSection[];
};

export type ExportZipFile = {
  name: string;
  content?: string;
  sourcePath?: string;
};

export type ExportTask =
  | { mode: 'single'; conversation: TChatConversation }
  | { mode: 'batch'; conversation_ids: string[] }
  | null;

export type ConversationRowProps = {
  conversation: TChatConversation;
  isGenerating: boolean;
  hasCompletionUnread: boolean;
  collapsed: boolean;
  tooltipEnabled: boolean;
  batchMode: boolean;
  checked: boolean;
  selected: boolean;
  menuVisible: boolean;
  onToggleChecked: (conversation: TChatConversation) => void;
  onConversationClick: (conversation: TChatConversation) => void;
  onOpenMenu: (conversation: TChatConversation) => void;
  onMenuVisibleChange: (conversation_id: string, visible: boolean) => void;
  onEditStart: (conversation: TChatConversation) => void;
  onDelete: (conversation_id: string) => void;
  onExport?: (conversation: TChatConversation) => void;
  onTogglePin: (conversation: TChatConversation) => void;
  getJobStatus: (conversation_id: string) => 'none' | 'active' | 'paused' | 'error' | 'unread';
  /** Available chat groups for the "Move to group" submenu. Omit to hide the submenu. */
  groups?: ChatGroup[];
  /** Move a conversation into a group (or out of all groups when groupId is null). Omit to hide the submenu. */
  onMoveToGroup?: (conversation: TChatConversation, groupId: string | null) => void;
  /** Prompt for a new group name, then move the conversation into it. Omit to hide the submenu. */
  onNewGroup?: (conversation: TChatConversation) => void;
  /** When true, the agent icon is dimmed by default and only shows full color on hover. Used inside project folders to reduce visual weight. */
  dimIcon?: boolean;
  /** Restart the durable broker peer for a peer conversation, keeping the same conversation_id. Omit to hide the menu item. */
  onRestartPeer?: (conversation: TChatConversation) => void;
  /** True while a peer restart is in-flight for this conversation (disables the menu item). */
  peerRestartInFlight?: boolean;
};

export type WorkspaceGroupedHistoryProps = {
  onSessionClick?: () => void;
  collapsed?: boolean;
  tooltipEnabled?: boolean;
  batchMode?: boolean;
  onBatchModeChange?: (value: boolean) => void;
  afterPinnedContent?: ReactNode;
};

export type DragItemType = 'conversation' | 'workspace';

export type DragItem = {
  type: DragItemType;
  id: string;
  conversation?: TChatConversation;
  workspaceGroup?: WorkspaceGroup;
  sourceSection: 'pinned' | string;
  sourceWorkspace?: string;
};
