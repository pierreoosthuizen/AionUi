/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { arrayMove } from '@dnd-kit/sortable';
import { resolvePeerGroup } from '@/renderer/hooks/agent/usePeerIdentity';
import { refreshConversationCache } from '@/renderer/pages/conversation/utils/conversationCache';
import { emitter } from '@/renderer/utils/emitter';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Claude-Desktop-style chat groups. Groups are user-defined labels decoupled from
 * the workspace/cwd. Group definitions (id -> name) live in renderer localStorage
 * (personal single-machine app); a conversation's membership rides in its opaque
 * `extra.groupId` on the backend, so no aioncore/Rust change is needed.
 */
const GROUPS_KEY = 'agora-chat-groups';

export type ChatGroup = { id: string; name: string };

const listeners = new Set<() => void>();

function readGroups(): ChatGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as ChatGroup[]) : [];
  } catch {
    return [];
  }
}

// Cache the parsed array so useSyncExternalStore gets a stable reference between
// renders (a fresh parse each getSnapshot would loop forever).
let cache: ChatGroup[] = readGroups();

function writeGroups(next: ChatGroup[]): void {
  cache = next;
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  listeners.forEach((l) => l());
}

/** Find a group by name (case-insensitive/trim-tolerant) or create it; returns its id. */
function ensureGroup(name: string): string {
  const trimmed = name.trim();
  const existing = readGroups().find((g) => g.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;
  const id = `g-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  writeGroups([...readGroups(), { id, name: trimmed }]);
  return id;
}

/**
 * Auto-grouping for peer-backed chats. When the chat's workspace maps to a peer
 * carrying a `group` (peers.json), move the chat into that group — CREATING the
 * group if it doesn't exist yet (a named-but-absent group would otherwise be a
 * silent no-op, the bug behind chats never landing in their peer group). Skips
 * when the chat already has a group, so it never overrides a manual placement —
 * which makes it safe to re-run on conversation OPEN, not only at creation.
 * Name match is case-insensitive/trim-tolerant.
 */
export async function autoAssignPeerGroup(
  conversationId: string,
  workspace?: string,
  currentGroupId?: string
): Promise<void> {
  if (!workspace || currentGroupId) return;
  const groupName = await resolvePeerGroup(workspace);
  if (!groupName) return;
  const groupId = ensureGroup(groupName);
  await ipcBridge.conversation.update.invoke({
    id: conversationId,
    updates: { extra: { groupId } as unknown as Partial<TChatConversation['extra']> },
    merge_extra: true,
  });
  await refreshConversationCache(conversationId);
  emitter.emit('chat.history.refresh');
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ChatGroup[] {
  return cache;
}

export function useGroups() {
  const groups = useSyncExternalStore(subscribe, getSnapshot);

  const createGroup = useCallback((name: string): string => {
    const id = `g-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    writeGroups([...readGroups(), { id, name: name.trim() }]);
    return id;
  }, []);

  const renameGroup = useCallback((id: string, name: string): void => {
    writeGroups(readGroups().map((g) => (g.id === id ? { ...g, name: name.trim() } : g)));
  }, []);

  const deleteGroup = useCallback((id: string): void => {
    writeGroups(readGroups().filter((g) => g.id !== id));
  }, []);

  /** Reorder groups by drag (active dropped onto over). Persists the new order. */
  const reorderGroups = useCallback((activeId: string, overId: string): void => {
    const cur = readGroups();
    const from = cur.findIndex((g) => g.id === activeId);
    const to = cur.findIndex((g) => g.id === overId);
    if (from === -1 || to === -1 || from === to) return;
    writeGroups(arrayMove(cur, from, to));
  }, []);

  /** Set (or clear, when groupId is null) a conversation's group membership. */
  const assignToGroup = useCallback(async (conversation: TChatConversation, groupId: string | null): Promise<void> => {
    await ipcBridge.conversation.update.invoke({
      id: conversation.id,
      // groupId is an opaque addition to extra; cast through unknown since it is
      // not declared on every conversation-type variant (read via getConversationGroupId).
      updates: { extra: { groupId: groupId ?? '' } as unknown as Partial<TChatConversation['extra']> },
      merge_extra: true,
    });
    await refreshConversationCache(conversation.id);
    emitter.emit('chat.history.refresh');
  }, []);

  return { groups, createGroup, renameGroup, deleteGroup, reorderGroups, assignToGroup };
}
