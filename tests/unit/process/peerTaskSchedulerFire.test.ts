/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPeerTask } from '@/common/adapter/ipcBridge';

// ADR-0002 §2 delivery contract — the feature's whole point AND its riskiest
// seam (the broker :7899 coupling), and the one branch that fails SILENTLY if it
// breaks. Resolve the task's managed_key against the live peer list:
//   present → send the prompt to that peer's CURRENT id;
//   absent  → silent-skip: NO send, no throw.
// peerTaskSchedule.test.ts covers the pure schedule math; this guards the wire.

const { getTaskMock, updateTaskMock } = vi.hoisted(() => ({ getTaskMock: vi.fn(), updateTaskMock: vi.fn() }));
vi.mock('@process/services/peerTaskStore', () => ({
  getTask: getTaskMock,
  updateTask: updateTaskMock,
  listTasks: vi.fn(() => []),
}));

import { fireNow } from '@process/services/peerTaskScheduler';

const task: IPeerTask = {
  id: 't1',
  name: 'Nightly digest',
  prompt: 'summarise the day',
  managed_key: 'conv-key-1',
  peer_label: 'codex — SecondBrain',
  frequency: 'daily',
  time: '09:00',
  enabled: true,
  created_at: 0,
  updated_at: 0,
};

const fetchMock = vi.fn();

// A broker peer list with the given rows, as /list-peers returns it.
const listPeersResponse = (rows: Array<{ id: string; managed_key: string | null }>) => ({
  ok: true,
  json: async () => rows.map((r) => ({ peer_name: 'codex', cwd: '/x', ...r })),
});

beforeEach(() => {
  getTaskMock.mockReturnValue(task);
  updateTaskMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sendCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/send-message'));

describe('fireNow (ADR-0002 §2 delivery)', () => {
  /** managed_key live in the peer list → send the prompt to that peer's current id. */
  it('sends to the live peer id when managed_key is active', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/list-peers'))
        return Promise.resolve(listPeersResponse([{ id: 'live-id-99', managed_key: 'conv-key-1' }]));
      return Promise.resolve({ ok: true, status: 200 });
    });

    const result = await fireNow('t1');

    expect(result.status).toBe('sent');
    const sends = sendCalls();
    expect(sends).toHaveLength(1);
    const body = JSON.parse(sends[0][1].body as string);
    expect(body.to_id).toBe('live-id-99'); // resolved live id, NOT the stored managed_key
    expect(body.text).toBe('summarise the day');
    expect(body.from_id).toBe('agora-cron');
    expect(updateTaskMock).toHaveBeenCalledWith('t1', expect.objectContaining({ last_status: 'sent' }));
  });

  /** managed_key absent from the peer list → silent-skip: no send, no throw. */
  it('silent-skips (no send, no throw) when the peer is not active', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/list-peers'))
        return Promise.resolve(listPeersResponse([{ id: 'other', managed_key: 'someone-else' }]));
      return Promise.resolve({ ok: true, status: 200 });
    });

    const result = await fireNow('t1');

    expect(result.status).toBe('skipped');
    expect(sendCalls()).toHaveLength(0); // the silent-fail branch: nothing sent
    expect(updateTaskMock).toHaveBeenCalledWith('t1', expect.objectContaining({ last_status: 'skipped' }));
  });

  /** Peer active but the send POST fails → error status, never throws to caller. */
  it('reports error without throwing when the send POST fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/list-peers'))
        return Promise.resolve(listPeersResponse([{ id: 'live-id-99', managed_key: 'conv-key-1' }]));
      return Promise.resolve({ ok: false, status: 503 }); // broker rejected the send
    });
    const result = await fireNow('t1');
    expect(result.status).toBe('error');
    expect(sendCalls()).toHaveLength(1); // it tried — the failure is the send, not the resolve
  });

  /** The broker being unreachable resolves to no peers → silent-skip, not error. */
  it('silent-skips when the broker is unreachable (list-peers throws)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fireNow('t1');
    expect(result.status).toBe('skipped');
    expect(sendCalls()).toHaveLength(0);
  });
});
