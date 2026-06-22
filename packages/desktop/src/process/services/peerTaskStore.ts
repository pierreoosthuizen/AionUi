/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peer-task store — a small JSON file in userData (ADR-0002 §1). Single writer
 * (main process), tiny volume → no lock, no DB. In-memory cache loaded once,
 * flushed on every mutation.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { ICreatePeerTaskParams, IPeerTask } from '@/common/adapter/ipcBridge';
import { computeNextRun } from './peerTaskSchedule';

let cache: IPeerTask[] | null = null;

function file(): string {
  return join(app.getPath('userData'), 'peer-tasks.json');
}

function load(): IPeerTask[] {
  if (cache) return cache;
  try {
    if (existsSync(file())) {
      const parsed = JSON.parse(readFileSync(file(), 'utf8')) as IPeerTask[];
      cache = Array.isArray(parsed) ? parsed : [];
    } else {
      cache = [];
    }
  } catch {
    cache = []; // corrupt file → start clean rather than crash the scheduler
  }
  return cache;
}

function save(): void {
  writeFileSync(file(), JSON.stringify(cache ?? [], null, 2), { mode: 0o600 });
}

export function listTasks(): IPeerTask[] {
  return [...load()];
}

export function getTask(id: string): IPeerTask | undefined {
  return load().find((t) => t.id === id);
}

export function addTask(input: ICreatePeerTaskParams): IPeerTask {
  const tasks = load();
  const now = Date.now();
  const task: IPeerTask = {
    id: `pt_${randomUUID()}`,
    name: input.name,
    description: input.description,
    prompt: input.prompt,
    managed_key: input.managed_key,
    peer_label: input.peer_label,
    frequency: input.frequency,
    time: input.time,
    weekday: input.weekday,
    enabled: true,
    next_run_at_ms: computeNextRun(input, now),
    created_at: now,
    updated_at: now,
  };
  tasks.push(task);
  save();
  return task;
}

export function updateTask(id: string, updates: Partial<IPeerTask>): IPeerTask {
  const tasks = load();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error(`peer task not found: ${id}`);
  const merged: IPeerTask = { ...tasks[idx], ...updates, id, updated_at: Date.now() };
  // Recompute next_run when the schedule shape changed (unless the caller set it
  // explicitly — the scheduler passes next_run_at_ms after a fire/rollforward).
  const scheduleTouched = 'frequency' in updates || 'time' in updates || 'weekday' in updates || 'enabled' in updates;
  if (scheduleTouched && !('next_run_at_ms' in updates)) {
    merged.next_run_at_ms = merged.enabled ? computeNextRun(merged, Date.now()) : undefined;
  }
  tasks[idx] = merged;
  save();
  return merged;
}

export function removeTask(id: string): void {
  const tasks = load();
  const next = tasks.filter((t) => t.id !== id);
  cache = next;
  save();
}
