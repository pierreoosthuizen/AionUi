/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Re-apply the claude-peers auto-pickup patch to the EXTRACTED claude-agent-acp
 * adapter on startup.
 *
 * The build patches the bundled template (scripts/patch-aioncore-channels.js), so
 * fresh installs extract a patched adapter. But aioncore extracts the adapter to a
 * persistent runtime root once and reuses it — an install that already extracted an
 * unpatched copy would never pick up the build patch. This covers those: it scans
 * the runtime roots and applies the same two edits, idempotently.
 *
 * ponytail: logic mirrors scripts/patch-aioncore-channels.js (CJS, not packaged into
 * the asar, so not requireable here). Keep the two in sync if the anchors change.
 * No watch/retry — a brand-new install's runtime may not exist yet when this runs,
 * but its bundled adapter is already patched, so the next extraction inherits it.
 */

import { app } from 'electron';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const FLAG_KEY = 'dangerously-load-development-channels';
const FLAG_ANCHOR = '"replay-user-messages": "",';
const FLAG_INSERT = `"replay-user-messages": "",\n                "${FLAG_KEY}": "server:claude-peers",`;

// Append the Agora math→KaTeX system prompt via the claude CLI's
// --append-system-prompt-file (extraArgs pass-through). Scoped to Agora's ACP
// spawn, so it never leaks to terminal peers. Anchor is the line FLAG_INSERT
// creates, so this must run after the flag insert below.
const APPEND_KEY = 'append-system-prompt-file';
const APPEND_PATH = '/Users/pierreo/Development/Projects/agora/AionUi/resources/agora-claude-system-prompt.md';
const APPEND_ANCHOR = `"${FLAG_KEY}": "server:claude-peers",`;
const APPEND_INSERT = `"${FLAG_KEY}": "server:claude-peers",\n                "${APPEND_KEY}": "${APPEND_PATH}",`;

const MCP_MARKER = '"claude-peers":';
const MCP_ANCHOR = 'mcpServers: { ...(userProvidedOptions?.mcpServers || {}), ...mcpServers },';
const MCP_INSERT =
  'mcpServers: { ...(userProvidedOptions?.mcpServers || {}), ...mcpServers, ' +
  '"claude-peers": { type: "stdio", command: "/Users/pierreo/.bun/bin/bun", ' +
  'args: ["/Users/pierreo/Development/ForkedRepos/claude-peers-mcp/server.ts"], env: { CLAUDE_PEERS_AGORA: "1" } } },';

// In-place upgrade for adapters patched before the env existed (see apply loop).
const MCP_ENV_OLD = 'args: ["/Users/pierreo/Development/ForkedRepos/claude-peers-mcp/server.ts"], env: {} }';
const MCP_ENV_NEW =
  'args: ["/Users/pierreo/Development/ForkedRepos/claude-peers-mcp/server.ts"], env: { CLAUDE_PEERS_AGORA: "1" } }';

function findAdapters(dir: string, found: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findAdapters(full, found);
    else if (entry.name === 'acp-agent.js' && full.includes('claude-agent-acp')) found.push(full);
  }
  return found;
}

/** Apply the claude-peers patch to every extracted adapter. Safe to call repeatedly. */
export function patchAcpChannels(): void {
  const roots = [join(homedir(), '.aionui', 'runtime'), join(app.getPath('userData'), 'aionui', 'runtime')];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of findAdapters(root)) {
      try {
        let src = readFileSync(file, 'utf-8');
        const before = src;
        if (!src.includes(FLAG_KEY) && src.includes(FLAG_ANCHOR)) src = src.replace(FLAG_ANCHOR, FLAG_INSERT);
        // After the flag insert — its created line is this anchor.
        if (!src.includes(APPEND_KEY) && src.includes(APPEND_ANCHOR)) src = src.replace(APPEND_ANCHOR, APPEND_INSERT);
        if (!src.includes(MCP_MARKER) && src.includes(MCP_ANCHOR)) src = src.replace(MCP_ANCHOR, MCP_INSERT);
        // Upgrade already-patched adapters (extracted before CLAUDE_PEERS_AGORA
        // existed): the MCP_MARKER guard above skips them, so flip the old empty
        // env in place. Idempotent — MCP_ENV_OLD is absent once upgraded.
        if (src.includes(MCP_ENV_OLD)) src = src.replace(MCP_ENV_OLD, MCP_ENV_NEW);
        if (src !== before) {
          writeFileSync(file, src);
          console.info(`[AionUi] patched claude-peers channels into ${file}`);
        }
      } catch (error) {
        console.warn(`[AionUi] patchAcpChannels failed for ${file}:`, error);
      }
    }
  }
}
