/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';
import { byName, CLAUDE_DIR, type SkillItem } from './useLoadedSkills';

/**
 * Resolve the MCP servers the embedded Claude Code agent sees, grouped by config
 * scope. The agent runs with `--setting-sources=user,project,local`, so its MCP
 * set is the union of:
 *   - user:    `~/.claude.json` → `mcpServers`
 *   - local:   `~/.claude.json` → `projects["<workspace>"].mcpServers`
 *   - project: `<workspace>/.mcp.json` → `mcpServers`
 *
 * Read-only view (mirrors Skills/Commands tabs) — no enable/disable here.
 * ponytail: lists every configured server; doesn't honor Claude Code's
 * enabled/disabledMcpjsonServers approval flags. Add that filter only if the
 * tab needs to reflect per-project .mcp.json approval state.
 */

// `~/.claude.json` is a sibling of the `.claude` dir, not inside it.
const CLAUDE_CONFIG_PATH = `${CLAUDE_DIR}.json`;

export type McpGroups = { user: SkillItem[]; local: SkillItem[]; project: SkillItem[] };

const EMPTY: McpGroups = { user: [], local: [], project: [] };

/** One-line transport summary for the row tooltip: `command args…` or `type: url`. */
export function summarizeTransport(cfg: unknown): string {
  if (!cfg || typeof cfg !== 'object') return '';
  const c = cfg as Record<string, unknown>;
  if (typeof c.url === 'string') {
    const type = typeof c.type === 'string' && c.type ? c.type : 'http';
    return `${type}: ${c.url}`;
  }
  const command = typeof c.command === 'string' ? c.command : '';
  const args = Array.isArray(c.args) ? c.args.filter((a): a is string => typeof a === 'string') : [];
  return [command, ...args].join(' ').trim();
}

/** `{ name: cfg }` map → sorted `{ name, description }` items. */
export function toMcpItems(servers: unknown): SkillItem[] {
  if (!servers || typeof servers !== 'object') return [];
  return Object.entries(servers as Record<string, unknown>)
    .map(([name, cfg]): SkillItem => ({ name, description: summarizeTransport(cfg) }))
    .toSorted(byName);
}

function readJson(path: string): Promise<Record<string, unknown> | null> {
  return fs.readFile
    .invoke({ path })
    .then((raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : null))
    .catch((): null => null);
}

export function useLoadedMcpServers(workspace?: string, epoch = 0): McpGroups {
  const [groups, setGroups] = useState<McpGroups>(EMPTY);
  useEffect(() => {
    void epoch; // ADR-0014: epoch bump re-runs this effect, re-reading JSON files
    let alive = true;
    void (async () => {
      const [claudeConfig, projectFile] = await Promise.all([
        readJson(CLAUDE_CONFIG_PATH),
        workspace ? readJson(`${workspace}/.mcp.json`) : Promise.resolve(null),
      ]);
      if (!alive) return;
      const projects = (claudeConfig?.projects as Record<string, { mcpServers?: unknown }>) || {};
      setGroups({
        user: toMcpItems(claudeConfig?.mcpServers),
        local: workspace ? toMcpItems(projects[workspace]?.mcpServers) : [],
        project: toMcpItems(projectFile?.mcpServers),
      });
    })();
    return () => {
      alive = false;
    };
  }, [workspace, epoch]);
  return groups;
}
