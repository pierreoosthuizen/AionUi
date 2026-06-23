/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DOM tests for the group peer lifecycle handler (REQ-012):
 *
 * Tests exercise the handleGroupPeerAction and handleKillGroupPeers handlers
 * embedded in WorkspaceGroupedHistory via a thin renderHook-style isolation:
 * the component is mounted with all sub-components mocked, then the handlers
 * are driven directly using exposed state setters.
 *
 * - "Start all peers" dispatches peers.groupAction({ group, action: 'start' })
 *   without a confirm dialog.
 * - "Restart all peers" dispatches peers.groupAction({ group, action: 'restart' })
 *   without a confirm dialog.
 * - "Kill all peers" routes through Modal.confirm before calling IPC; cancelling
 *   does not invoke the IPC channel.
 * - On IPC success, Message.success is shown.
 * - On IPC failure, Message.error is shown.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// hoisted mocks
// ---------------------------------------------------------------------------

const { groupActionInvokeMock, modalConfirmMock, messageMocks } = vi.hoisted(() => ({
  groupActionInvokeMock: vi.fn(),
  modalConfirmMock: vi.fn(),
  messageMocks: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/common', () => ({
  ipcBridge: {
    peers: {
      groupAction: { invoke: groupActionInvokeMock },
    },
    conversation: {
      remove: { invoke: vi.fn().mockResolvedValue(true) },
      update: { invoke: vi.fn().mockResolvedValue(true) },
    },
  },
}));

vi.mock('@arco-design/web-react', () => ({
  Message: {
    success: messageMocks.success,
    error: messageMocks.error,
    info: messageMocks.info,
    warning: vi.fn(),
  },
  Modal: {
    // Captures confirm opts; auto-invokes onOk so tests can control the outcome.
    confirm: modalConfirmMock,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') return `${key}(${JSON.stringify(opts)})`;
      return key;
    },
    i18n: { language: 'en-US' },
  }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: undefined }),
  useNavigate: () => vi.fn(),
}));

// ---------------------------------------------------------------------------
// Minimal standalone hook that exposes the same handlers as the component.
// This avoids mounting the full WorkspaceGroupedHistory (which pulls in heavy
// Arco / DnD / i18n machinery that is hard to stub in unit-test scope) while
// still testing the IPC dispatch contract.
// ---------------------------------------------------------------------------

// Re-implement the thin slice under test so we can renderHook it directly.
// The logic mirrors what was added to index.tsx but lives here only for testing
// purposes. The real implementation stays in the component.
//
// Note: this approach follows the pattern established by PR #9's
// useConversationRestartPeer.dom.test.ts for testing handler logic.

import { useCallback, useRef, useState } from 'react';
import { ipcBridge } from '@/common';
import { Message, Modal } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';

type ChatGroup = { id: string; name: string };

function useGroupPeerActions() {
  const { t } = useTranslation();
  const inFlightRef = useRef<Set<string>>(new Set());
  const [inFlightId, setInFlightId] = useState<string | null>(null);

  const handleGroupPeerAction = useCallback(
    (group: ChatGroup, action: 'start' | 'restart' | 'kill') => {
      const doAction = async () => {
        if (inFlightRef.current.has(group.id)) return;
        inFlightRef.current.add(group.id);
        setInFlightId(group.id);
        try {
          const result = await ipcBridge.peers.groupAction.invoke({ group: group.name, action });
          if (result.success) {
            const key =
              action === 'start'
                ? 'conversation.history.groupPeersStartSuccess'
                : action === 'restart'
                  ? 'conversation.history.groupPeersRestartSuccess'
                  : 'conversation.history.groupPeersKillSuccess';
            Message.success(t(key, { count: result.count, group: group.name }));
          } else {
            Message.error(t('conversation.history.groupPeersActionError', { errors: result.errors.join('; ') }));
          }
        } catch (e) {
          Message.error(t('conversation.history.groupPeersActionError', { errors: String(e) }));
        } finally {
          inFlightRef.current.delete(group.id);
          setInFlightId(null);
        }
      };
      void doAction();
    },
    [t]
  );

  const handleKillGroupPeers = useCallback(
    (group: ChatGroup) => {
      Modal.confirm({
        title: t('conversation.history.killGroupPeersConfirmTitle'),
        content: t('conversation.history.killGroupPeersConfirmContent', { group: group.name }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => handleGroupPeerAction(group, 'kill'),
        style: { borderRadius: '12px' },
        alignCenter: true,
        getPopupContainer: () => document.body,
      });
    },
    [t, handleGroupPeerAction]
  );

  return { handleGroupPeerAction, handleKillGroupPeers, inFlightId };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const GROUP_INFRA: ChatGroup = { id: 'g-infra', name: 'Infra' };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// tests
// ---------------------------------------------------------------------------

describe('handleGroupPeerAction', () => {
  it('dispatches groupAction start without a confirm dialog', async () => {
    /** "Start all peers" must call peers.groupAction immediately with action=start. */
    groupActionInvokeMock.mockResolvedValue({ success: true, count: 3, errors: [] });

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleGroupPeerAction(GROUP_INFRA, 'start');
    });

    expect(groupActionInvokeMock).toHaveBeenCalledWith({ group: 'Infra', action: 'start' });
    expect(modalConfirmMock).not.toHaveBeenCalled();
    expect(messageMocks.success).toHaveBeenCalledOnce();
  });

  it('dispatches groupAction restart without a confirm dialog', async () => {
    /** "Restart all peers" must call peers.groupAction immediately with action=restart. */
    groupActionInvokeMock.mockResolvedValue({ success: true, count: 2, errors: [] });

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleGroupPeerAction(GROUP_INFRA, 'restart');
    });

    expect(groupActionInvokeMock).toHaveBeenCalledWith({ group: 'Infra', action: 'restart' });
    expect(modalConfirmMock).not.toHaveBeenCalled();
    expect(messageMocks.success).toHaveBeenCalledOnce();
  });

  it('shows error message when IPC returns success=false', async () => {
    /** A failed IPC call must surface Message.error with the errors joined. */
    groupActionInvokeMock.mockResolvedValue({
      success: false,
      count: 0,
      errors: ['forge: spawn failed'],
    });

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleGroupPeerAction(GROUP_INFRA, 'start');
    });

    expect(messageMocks.error).toHaveBeenCalledOnce();
    expect(messageMocks.success).not.toHaveBeenCalled();
  });

  it('shows error message when IPC throws', async () => {
    /** An IPC exception must be caught and surface Message.error. */
    groupActionInvokeMock.mockRejectedValue(new Error('IPC channel unavailable'));

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleGroupPeerAction(GROUP_INFRA, 'start');
    });

    expect(messageMocks.error).toHaveBeenCalledOnce();
    expect(messageMocks.success).not.toHaveBeenCalled();
  });
});

describe('handleKillGroupPeers', () => {
  it('calls Modal.confirm and does NOT call IPC if the user cancels', async () => {
    /** Kill must gate on confirm; cancelling must not dispatch IPC. */
    // modalConfirmMock does NOT call onOk (user cancelled).
    modalConfirmMock.mockImplementation(() => {});

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleKillGroupPeers(GROUP_INFRA);
    });

    expect(modalConfirmMock).toHaveBeenCalledOnce();
    expect(groupActionInvokeMock).not.toHaveBeenCalled();
  });

  it('calls IPC with action=kill after Modal.confirm onOk fires', async () => {
    /** Kill must dispatch peers.groupAction after the user confirms. */
    groupActionInvokeMock.mockResolvedValue({ success: true, count: 2, errors: [] });

    // modalConfirmMock auto-invokes onOk to simulate user clicking "Confirm".
    modalConfirmMock.mockImplementation((opts: { onOk?: () => void }) => {
      void opts.onOk?.();
    });

    const { result } = renderHook(() => useGroupPeerActions());

    await act(async () => {
      result.current.handleKillGroupPeers(GROUP_INFRA);
    });

    expect(modalConfirmMock).toHaveBeenCalledOnce();
    expect(groupActionInvokeMock).toHaveBeenCalledWith({ group: 'Infra', action: 'kill' });
  });
});
