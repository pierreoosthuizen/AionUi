/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
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

/**
 * On new-chat creation: if the chat's workspace maps to a peer that carries a
 * `group` (peers.json), and a group with that name ALREADY exists, move the chat
 * into it. Never auto-creates a group — an unmatched chat stays Ungrouped.
 * Name match is case-insensitive/trim-tolerant.
 */
export async function autoAssignPeerGroup(conversationId: string, workspace?: string): Promise<void> {
  if (!workspace) return;
  const groupName = await resolvePeerGroup(workspace);
  if (!groupName) return;
  const wanted = groupName.trim().toLowerCase();
  const match = readGroups().find((g) => g.name.trim().toLowerCase() === wanted);
  if (!match) return;
  await ipcBridge.conversation.update.invoke({
    id: conversationId,
    updates: { extra: { groupId: match.id } as unknown as Partial<TChatConversation['extra']> },
    merge_extra: true,
  });
  await refreshConversationCache(conversationId);
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

  return { groups, createGroup, renameGroup, deleteGroup, assignToGroup };
}
