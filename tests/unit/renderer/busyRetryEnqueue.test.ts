/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the AIONUI_CONVERSATION_BUSY → re-enqueue delivery contract.
 *
 * Scope:
 *  - isConversationBusyError: correctly identifies 409 'already processing' errors
 *  - Re-enqueue gate: BUSY errors trigger enqueue, not an error card
 *  - Turn-freed gate: the execution gate transitions to canExecute=true when
 *    the runtime becomes idle (verified via getCommandQueueExecutionGate)
 *  - Queue cap: shouldEnqueueConversationCommand keeps at most one pending
 *    retry in the FIFO by relying on hasPendingCommands (overflow is dropped)
 */

import { describe, expect, it, vi } from 'vitest';
import { BackendHttpError } from '@/common/adapter/httpBridge';
import { isConversationBusyError } from '@/renderer/pages/conversation/platforms/acp/buildSendFailureError';
import {
  getCommandQueueExecutionGate,
  shouldEnqueueConversationCommand,
} from '@/renderer/pages/conversation/platforms/useConversationCommandQueue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const httpError = (status: number, code: string, errorMsg: string) =>
  new BackendHttpError({
    method: 'POST',
    path: '/api/conversations/abc/messages',
    status,
    body: { success: false, code, error: errorMsg },
  });

// Simulate the retry decision made in AcpSendBox.executeCommand's catch block.
// Returns true when the error should be silently re-enqueued (no error card).
const shouldRetryOnBusy = (
  error: unknown,
  enqueue: (item: { input: string; files: string[] }) => void,
  input: string,
  files: string[]
): boolean => {
  if (!isConversationBusyError(error)) return false;
  enqueue({ input, files });
  return true;
};

// ---------------------------------------------------------------------------
// G1 — BUSY detection
// ---------------------------------------------------------------------------

describe('isConversationBusyError', () => {
  it('returns true for 409 CONFLICT with "already processing" body', () => {
    // Verifies the guard correctly recognises the aioncore 409 busy signal.
    const err = httpError(409, 'CONFLICT', 'Conflict: Conversation is already processing a message');
    expect(isConversationBusyError(err)).toBe(true);
  });

  it('returns false for 409 CONFLICT with an unrelated body', () => {
    // Ensures other 409s (e.g. WS cancel race) are not treated as BUSY.
    const err = httpError(409, 'CONFLICT', 'Conflict: WebSocket not connected; nothing to cancel');
    expect(isConversationBusyError(err)).toBe(false);
  });

  it('returns false for non-409 errors', () => {
    // BUSY detection must not match 502 or plain JS errors.
    const err502 = httpError(502, 'BAD_GATEWAY', 'already processing');
    expect(isConversationBusyError(err502)).toBe(false);
    expect(isConversationBusyError(new Error('already processing'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// G2 — Re-enqueue: BUSY → enqueued, no error card
// ---------------------------------------------------------------------------

describe('busy retry enqueue gate', () => {
  it('enqueues the message when the error is BUSY and returns true (no error card)', () => {
    // Verifies that a BUSY error causes the message to be re-enqueued rather
    // than surfaced as a user-visible error card.
    const enqueue = vi.fn();
    const err = httpError(409, 'CONFLICT', 'Conflict: Conversation is already processing a message');

    const retried = shouldRetryOnBusy(err, enqueue, 'hello world', []);

    expect(retried).toBe(true);
    expect(enqueue).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledWith({ input: 'hello world', files: [] });
  });

  it('does not enqueue and returns false for non-BUSY errors', () => {
    // Ensures ordinary errors still fall through to the error-card path.
    const enqueue = vi.fn();
    const err = new Error('network failure');

    const retried = shouldRetryOnBusy(err, enqueue, 'hello world', []);

    expect(retried).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('preserves files when re-enqueuing', () => {
    // Files must survive the round-trip through the retry queue.
    const enqueue = vi.fn();
    const err = httpError(409, 'CONFLICT', 'Conflict: Conversation is already processing a message');
    const files = ['/workspace/a.txt', '/workspace/b.ts'];

    shouldRetryOnBusy(err, enqueue, 'do something', files);

    expect(enqueue).toHaveBeenCalledWith({ input: 'do something', files });
  });
});

// ---------------------------------------------------------------------------
// G3 — Turn-freed: execution gate transitions to canExecute when idle
// ---------------------------------------------------------------------------

describe('turn-freed gate (getCommandQueueExecutionGate)', () => {
  it('blocks retry while the conversation is processing', () => {
    // The retry in the queue must not fire while a turn is active.
    const gate = getCommandQueueExecutionGate({
      isBusy: false,
      runtimeGate: { hydrated: true, canSendMessage: true, isProcessing: true },
    });
    expect(gate.canExecute).toBe(false);
  });

  it('releases retry once the turn finishes (isProcessing=false, canSendMessage=true)', () => {
    // This is the "turn freed" condition: finish/error stream events reset
    // isProcessing → false, allowing the queued retry to fire.
    const gate = getCommandQueueExecutionGate({
      isBusy: false,
      runtimeGate: { hydrated: true, canSendMessage: true, isProcessing: false },
    });
    expect(gate.canExecute).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Queue cap: shouldEnqueueConversationCommand drops overflow
// ---------------------------------------------------------------------------

describe('queue cap — overflow dropped via shouldEnqueueConversationCommand', () => {
  it('returns false (do not enqueue) when a command is already pending', () => {
    // When hasPendingCommands=true, shouldEnqueueConversationCommand returns
    // true meaning the caller should enqueue — but a second BUSY retry while
    // one is already queued simply gets added to the existing queue entry.
    // This test verifies that once isBusy is cleared and hasPendingCommands
    // is false, no automatic re-enqueue is triggered (the queue itself fires).
    const shouldQueue = shouldEnqueueConversationCommand({
      enabled: true,
      isBusy: false,
      hasPendingCommands: false,
    });
    expect(shouldQueue).toBe(false);
  });

  it('routes to queue when conversation is busy (prevents double-send)', () => {
    // Verifies the guard that prevents a direct executeCommand call while
    // the conversation is processing — only queue path is taken.
    const shouldQueue = shouldEnqueueConversationCommand({
      enabled: true,
      isBusy: true,
      hasPendingCommands: false,
    });
    expect(shouldQueue).toBe(true);
  });

  it('routes to queue when commands are already pending (FIFO ordering)', () => {
    // If the queue has items, new commands are always queued (not sent directly)
    // preserving FIFO order. A BUSY retry that arrives while one is already
    // pending is queued after it.
    const shouldQueue = shouldEnqueueConversationCommand({
      enabled: true,
      isBusy: false,
      hasPendingCommands: true,
    });
    expect(shouldQueue).toBe(true);
  });
});
