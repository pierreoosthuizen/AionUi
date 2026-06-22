/**
 * aionui-fork patch: enable claude-peers auto-pickup in the bundled
 * claude-agent-acp adapter.
 *
 * The adapter spawns the real `claude` binary. Two edits are needed so inbound
 * claude-peers channel messages reach Agora's embedded agent the same way they
 * reach every CLI peer:
 *
 *   1. mcpServers — add the claude-peers stdio server to the record the adapter
 *      assembles, so the spawned claude actually runs it (registration + tools).
 *   2. extraArgs — add `--dangerously-load-development-channels server:claude-peers`
 *      so the channel transport binds to that server and pushes inject as turns.
 *
 * Without (1) the flag in (2) names a server that doesn't exist → no channel.
 *
 * This edits a downloaded managed-resource, clobbered whenever aioncore is
 * re-fetched (prepareAioncore) or re-extracted to a runtime root. It is run from
 * the build (against resources/bundled-aioncore) and re-applied at app startup
 * against the extracted runtime roots. Idempotent; no-op if no adapter present.
 *
 * ponytail: hardcoded bun/server.ts path — personal single-machine build. The
 * clean fix is an aioncore ACP spawn-config option, which the binary doesn't expose.
 */

const fs = require('fs');
const path = require('path');

// --- (2) channels flag, inserted into extraArgs ---
const FLAG_KEY = 'dangerously-load-development-channels';
const FLAG_VALUE = 'server:claude-peers';
const FLAG_ANCHOR = '"replay-user-messages": "",';
const FLAG_INSERT = `"replay-user-messages": "",\n                // aionui-fork patch: enable claude-peers auto-pickup (channel\n                // messages inject as user turns). See scripts/patch-aioncore-channels.js.\n                "${FLAG_KEY}": "${FLAG_VALUE}",`;

// --- (1) claude-peers MCP server, inserted into the mcpServers assembly ---
const MCP_MARKER = '"claude-peers":';
const MCP_ANCHOR = 'mcpServers: { ...(userProvidedOptions?.mcpServers || {}), ...mcpServers },';
const MCP_INSERT =
  'mcpServers: { ...(userProvidedOptions?.mcpServers || {}), ...mcpServers, ' +
  '"claude-peers": { type: "stdio", command: "/Users/pierreo/.bun/bin/bun", ' +
  'args: ["/Users/pierreo/Development/ForkedRepos/claude-peers-mcp/server.ts"], env: { CLAUDE_PEERS_AGORA: "1" } } },';

/** Recursively collect every adapter acp-agent.js under a root. */
function findAdapterFiles(dir, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAdapterFiles(full, found);
    } else if (entry.name === 'acp-agent.js' && full.includes('claude-agent-acp')) {
      found.push(full);
    }
  }
  return found;
}

/** Apply both inserts to one file. Returns { flag, mcp } each 'patched'|'already'|'no-anchor'. */
function patchFile(file) {
  let src = fs.readFileSync(file, 'utf-8');
  const before = src;
  const status = { flag: 'already', mcp: 'already' };

  if (!src.includes(FLAG_KEY)) {
    status.flag = src.includes(FLAG_ANCHOR) ? 'patched' : 'no-anchor';
    if (status.flag === 'patched') src = src.replace(FLAG_ANCHOR, FLAG_INSERT);
  }
  if (!src.includes(MCP_MARKER)) {
    status.mcp = src.includes(MCP_ANCHOR) ? 'patched' : 'no-anchor';
    if (status.mcp === 'patched') src = src.replace(MCP_ANCHOR, MCP_INSERT);
  }
  if (src !== before) fs.writeFileSync(file, src);
  return status;
}

/** Patch every adapter found under the given roots. Returns count of files changed. */
function patchAdapters(roots) {
  let changed = 0;
  let total = 0;
  for (const root of roots) {
    for (const file of findAdapterFiles(root)) {
      total++;
      const { flag, mcp } = patchFile(file);
      const rel = path.relative(path.resolve(__dirname, '..'), file);
      if (flag === 'patched' || mcp === 'patched') {
        changed++;
        console.log(`  ✓ patched ${rel} (flag:${flag} mcp:${mcp})`);
      } else if (flag === 'no-anchor' || mcp === 'no-anchor') {
        console.warn(`  ! anchor missing ${rel} (flag:${flag} mcp:${mcp})`);
      } else {
        console.log(`  • already patched ${rel}`);
      }
    }
  }
  if (total === 0) {
    console.log('patch-aioncore-channels: no claude-agent-acp adapter found — skipping.');
  } else {
    console.log(`patch-aioncore-channels: ${changed} file(s) patched, ${total} total.`);
  }
  return changed;
}

module.exports = { patchAdapters, findAdapterFiles, patchFile };

// CLI: default to the bundled template; accept extra runtime roots as args.
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..');
  const roots = process.argv.slice(2);
  if (roots.length === 0) roots.push(path.join(projectRoot, 'resources', 'bundled-aioncore'));
  patchAdapters(roots);
}
