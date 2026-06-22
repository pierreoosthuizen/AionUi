/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { listContinuation } from '@/renderer/utils/chat/listContinuation';
import { describe, expect, it } from 'vitest';

describe('listContinuation', () => {
  it('continues a dash bullet', () => {
    expect(listContinuation('- foo')).toEqual({ insert: '\n- ' });
  });

  it('continues asterisk and plus bullets, preserving indent', () => {
    expect(listContinuation('  * bar')).toEqual({ insert: '\n  * ' });
    expect(listContinuation('    + baz')).toEqual({ insert: '\n    + ' });
  });

  it('increments an ordered item', () => {
    expect(listContinuation('3. baz')).toEqual({ insert: '\n4. ' });
    expect(listContinuation('  9. nested')).toEqual({ insert: '\n  10. ' });
  });

  it('exits the list on an empty item', () => {
    expect(listContinuation('- ')).toEqual({ exit: true });
    expect(listContinuation('2. ')).toEqual({ exit: true });
    expect(listContinuation('  * ')).toEqual({ exit: true });
  });

  it('ignores non-list lines', () => {
    expect(listContinuation('plain text')).toBeNull();
    expect(listContinuation('')).toBeNull();
    expect(listContinuation('-no space')).toBeNull();
  });
});
