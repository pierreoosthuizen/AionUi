/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { keepOnlyClaude } from '@/renderer/utils/model/agentTypes';
import type { AgentMetadata } from '@/renderer/utils/model/agentTypes';

/**
 * Agora fork only offers Claude: keepOnlyClaude must keep the Claude backend
 * and user-created custom agents, and drop the other bundled detections
 * (Aion CLI / aionrs, OpenClaw) that the backend binary still reports.
 */
const agent = (over: Partial<AgentMetadata>): AgentMetadata =>
  ({ id: 'x', name: 'x', agent_type: 'acp', agent_source: 'internal', enabled: true, available: true, ...over }) as AgentMetadata;

describe('keepOnlyClaude', () => {
  it('keeps the Claude backend', () => {
    const kept = keepOnlyClaude([agent({ backend: 'claude' })]);
    expect(kept).toHaveLength(1);
  });

  it('drops Aion CLI (aionrs) and OpenClaw', () => {
    const kept = keepOnlyClaude([
      agent({ backend: 'aionrs', agent_type: 'aionrs' }),
      agent({ backend: 'openclaw', agent_type: 'openclaw-gateway' }),
    ]);
    expect(kept).toHaveLength(0);
  });

  it('keeps user-created custom agents regardless of backend', () => {
    const kept = keepOnlyClaude([agent({ backend: 'whatever', agent_source: 'custom' })]);
    expect(kept).toHaveLength(1);
  });

  it('filters a mixed list down to Claude + custom', () => {
    const kept = keepOnlyClaude([
      agent({ backend: 'claude' }),
      agent({ backend: 'aionrs', agent_type: 'aionrs' }),
      agent({ backend: 'gemini' }),
      agent({ backend: 'mine', agent_source: 'custom' }),
    ]);
    expect(kept.map((a) => a.backend)).toEqual(['claude', 'mine']);
  });
});
