/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer-task bridge — exposes the native peer-task store + scheduler to the
 * renderer (ADR-0002). CRUD on the JSON store plus live-peer discovery and an
 * immediate "run now". Mutations return the fresh row so the UI can refresh.
 */

import { ipcBridge } from '@/common';
import { addTask, listTasks, removeTask, updateTask } from '../services/peerTaskStore';
import { fireNow, listActivePeers } from '../services/peerTaskScheduler';

export function initPeerTaskBridge(): void {
  ipcBridge.peerTask.list.provider(async () => listTasks());
  ipcBridge.peerTask.add.provider(async (input) => addTask(input));
  ipcBridge.peerTask.update.provider(async ({ id, updates }) => updateTask(id, updates));
  ipcBridge.peerTask.remove.provider(async ({ id }) => {
    removeTask(id);
  });
  ipcBridge.peerTask.runNow.provider(async ({ id }) => fireNow(id));
  ipcBridge.peerTask.listActivePeers.provider(async () => listActivePeers());
}
