/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for the peerBridge IPC handler (REQ-007):
 *
 * - initPeerBridge registers a 'peer:restart' provider.
 * - On resetManagedPeer success → handler returns { success: true, status }.
 * - On resetManagedPeer rejection → handler returns { success: false, msg }
 *   (never throws — the renderer must receive a structured response).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resetManagedPeerMock, providerMock } = vi.hoisted(() => ({
  resetManagedPeerMock: vi.fn(),
  providerMock: vi.fn(),
}));

// Mock the peerAutoPickup module so we control resetManagedPeer's return value.
vi.mock('@/process/utils/peerAutoPickup', () => ({
  resetManagedPeer: resetManagedPeerMock,
  nameForWorkspace: vi.fn(),
  startPeerAutoPickup: vi.fn(),
  stopPeerAutoPickup: vi.fn(),
}));

// Mock ipcBridge.peer.restart so we can capture the registered handler.
vi.mock('@/common', () => ({
  ipcBridge: {
    peer: {
      restart: { provider: providerMock },
    },
  },
}));

// Capture the handler registered by initPeerBridge.
type Handler = (params: { conversation_id: string }) => Promise<unknown>;
let registeredHandler: Handler;

beforeEach(async () => {
  vi.clearAllMocks();
  providerMock.mockImplementation((handler: Handler) => {
    registeredHandler = handler;
  });

  // Re-import to get a fresh module and re-register the handler.
  vi.resetModules();
  const { initPeerBridge } = await import('@/process/bridge/peerBridge');
  initPeerBridge();
});

describe('peer:restart IPC handler', () => {
  it('registers a provider for the peer:restart channel', () => {
    // Verifies initPeerBridge wires up the IPC channel.
    expect(providerMock).toHaveBeenCalledOnce();
  });

  it('returns { success: true, status } when resetManagedPeer resolves with reset', async () => {
    // Happy path: the broker unregister succeeds.
    resetManagedPeerMock.mockResolvedValue({ status: 'reset' });

    const result = (await registeredHandler({ conversation_id: 'conv-123' })) as {
      success: boolean;
      status: string;
    };

    expect(result.success).toBe(true);
    expect(result.status).toBe('reset');
    expect(resetManagedPeerMock).toHaveBeenCalledWith('conv-123');
  });

  it('returns { success: true, status: not_found } when no peer is managed', async () => {
    // not_found is a valid success response — peer was simply not active.
    resetManagedPeerMock.mockResolvedValue({ status: 'not_found' });

    const result = (await registeredHandler({ conversation_id: 'conv-inactive' })) as {
      success: boolean;
      status: string;
    };

    expect(result.success).toBe(true);
    expect(result.status).toBe('not_found');
  });

  it('returns { success: false, msg } and never throws when resetManagedPeer rejects', async () => {
    // Error path: any rejection must be caught and wrapped so the renderer
    // always receives a structured result, never an unhandled IPC exception.
    resetManagedPeerMock.mockRejectedValue(new Error('broker unreachable'));

    const result = (await registeredHandler({ conversation_id: 'conv-broken' })) as {
      success: boolean;
      msg?: string;
    };

    expect(result.success).toBe(false);
    expect(result.msg).toMatch(/broker unreachable/);
  });
});
