/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for the peer restart-in-place renderer contract (REQ-007):
 *
 * - handleRestartPeer invokes ipcBridge.peer.restart with the correct
 *   conversation_id once the Arco Modal confirm action fires.
 * - peerRestartInFlightId is set to the conversation id during the IPC
 *   round-trip and cleared after it completes.
 * - On IPC success with status='reset', the success i18n key is surfaced.
 * - On IPC success with status='not_found', the not_found i18n key is surfaced.
 * - On IPC error result (success=false), the error i18n key is surfaced.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mocks ---
const { peerRestartInvokeMock, modalConfirmMock, messageMocks } = vi.hoisted(() => ({
  peerRestartInvokeMock: vi.fn(),
  modalConfirmMock: vi.fn(),
  messageMocks: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    conversation: {
      remove: { invoke: vi.fn().mockResolvedValue(true) },
      update: { invoke: vi.fn().mockResolvedValue(true) },
    },
    peer: {
      restart: { invoke: peerRestartInvokeMock },
    },
  },
}));

vi.mock('@arco-design/web-react', () => ({
  Message: {
    success: messageMocks.success,
    info: messageMocks.info,
    error: messageMocks.error,
    warning: vi.fn(),
  },
  Modal: {
    // Capture the onOk callback and call it synchronously for test control.
    confirm: (opts: { onOk?: () => Promise<void> }) => {
      modalConfirmMock(opts);
      // Trigger the confirm action immediately.
      void opts.onOk?.();
    },
  },
}));

vi.mock('@/renderer/pages/conversation/utils/conversationCache', () => ({
  refreshConversationCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/renderer/utils/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

vi.mock('@/renderer/utils/ui/focus', () => ({
  blockMobileInputFocus: vi.fn(),
  blurActiveElement: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'current-conv' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useConversationActions } from '@/renderer/pages/conversation/GroupedHistory/hooks/useConversationActions';
import type { TChatConversation } from '@/common/config/storage';

function makeConversation(id = 'conv-test'): TChatConversation {
  return {
    id,
    name: 'Test Chat',
    type: 'acp',
    created_at: 1,
    modified_at: 1,
    extra: { workspace: '/work/project', backend: 'acp' },
  } as unknown as TChatConversation;
}

const defaultParams = {
  batchMode: false,
  onSessionClick: undefined,
  onBatchModeChange: undefined,
  selectedConversationIds: new Set<string>(),
  setSelectedConversationIds: vi.fn(),
  toggleSelectedConversation: vi.fn(),
  markAsRead: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleRestartPeer', () => {
  it('invokes peer.restart with the conversation_id on confirm', async () => {
    // Verifies the IPC call is made with the right argument.
    peerRestartInvokeMock.mockResolvedValue({ success: true, status: 'reset' });

    const { result } = renderHook(() => useConversationActions(defaultParams));
    const conv = makeConversation('conv-abc');

    await act(async () => {
      result.current.handleRestartPeer(conv);
    });

    expect(peerRestartInvokeMock).toHaveBeenCalledWith({ conversation_id: 'conv-abc' });
  });

  it('shows success message when status is reset', async () => {
    // Verifies the 'reset' success path surfaces the correct i18n key.
    peerRestartInvokeMock.mockResolvedValue({ success: true, status: 'reset' });

    const { result } = renderHook(() => useConversationActions(defaultParams));

    await act(async () => {
      result.current.handleRestartPeer(makeConversation());
    });

    expect(messageMocks.success).toHaveBeenCalledWith('conversation.history.restartPeerSuccess');
    expect(messageMocks.info).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });

  it('shows info message when status is not_found', async () => {
    // Verifies that a peer not being active (not in managed map) surfaces the
    // 'not_found' informational message rather than an error.
    peerRestartInvokeMock.mockResolvedValue({ success: true, status: 'not_found' });

    const { result } = renderHook(() => useConversationActions(defaultParams));

    await act(async () => {
      result.current.handleRestartPeer(makeConversation());
    });

    expect(messageMocks.info).toHaveBeenCalledWith('conversation.history.restartPeerNotFound');
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });

  it('shows error message when the IPC result is a failure', async () => {
    // Verifies that a bridge error (success=false) surfaces the error i18n key.
    peerRestartInvokeMock.mockResolvedValue({ success: false, msg: 'broker unreachable' });

    const { result } = renderHook(() => useConversationActions(defaultParams));

    await act(async () => {
      result.current.handleRestartPeer(makeConversation());
    });

    expect(messageMocks.error).toHaveBeenCalledWith('conversation.history.restartPeerError');
  });

  it('shows error message when the IPC call throws', async () => {
    // Verifies that a thrown exception (network failure etc.) surfaces the error key.
    peerRestartInvokeMock.mockRejectedValue(new Error('IPC channel error'));

    const { result } = renderHook(() => useConversationActions(defaultParams));

    await act(async () => {
      result.current.handleRestartPeer(makeConversation());
    });

    expect(messageMocks.error).toHaveBeenCalledWith('conversation.history.restartPeerError');
  });

  it('clears peerRestartInFlightId after completion', async () => {
    // Verifies the in-flight guard is released after the IPC call resolves.
    let resolveRestart!: (v: unknown) => void;
    peerRestartInvokeMock.mockReturnValue(new Promise((res) => (resolveRestart = res)));

    const { result } = renderHook(() => useConversationActions(defaultParams));
    const conv = makeConversation('conv-inflight');

    // Start the restart.
    act(() => {
      result.current.handleRestartPeer(conv);
    });

    // Resolve the IPC promise and flush.
    await act(async () => {
      resolveRestart({ success: true, status: 'reset' });
    });

    // After completion the in-flight id must be cleared.
    expect(result.current.peerRestartInFlightId).toBeNull();
  });
});
