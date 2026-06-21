/**
 * aionui-fork patch: enable claude-peers auto-pickup in the bundled
 * claude-agent-acp adapter.
 *
 * The adapter spawns the real `claude` binary with `extraArgs`. Adding
 * `--dangerously-load-development-channels server:claude-peers` makes inbound
 * claude-peers channel notifications inject as user turns (same as every CLI
 * peer), so AionUi peers auto-respond instead of waiting for a manual prompt.
 *
 * This edits a downloaded managed-resource, which is clobbered whenever
 * aioncore is re-fetched (prepareAioncore). Re-run this script after any
 * re-fetch:  node scripts/patch-aioncore-channels.js
 *
 * Idempotent: skips files already patched. No-op if no adapter is bundled yet.
 */

const fs = require('fs');
const path = require('path');

const FLAG_KEY = 'dangerously-load-development-channels';
const FLAG_VALUE = 'server:claude-peers';
const ANCHOR = '"replay-user-messages": "",';
const INSERT = `"replay-user-messages": "",\n                // aionui-fork patch: enable claude-peers auto-pickup (channel\n                // messages inject as user turns). Re-applied by scripts/patch-aioncore-channels.js.\n                "${FLAG_KEY}": "${FLAG_VALUE}",`;

const projectRoot = path.resolve(__dirname, '..');
const bundledRoot = path.join(projectRoot, 'resources', 'bundled-aioncore');

/** Recursively collect every bundled adapter acp-agent.js. */
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

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf-8');
  if (src.includes(FLAG_KEY)) return 'already';
  if (!src.includes(ANCHOR)) return 'no-anchor';
  fs.writeFileSync(file, src.replace(ANCHOR, INSERT));
  return 'patched';
}

const files = findAdapterFiles(bundledRoot);
if (files.length === 0) {
  console.log(
    'patch-aioncore-channels: no bundled claude-agent-acp adapter found (run prepareAioncore first) — skipping.'
  );
  process.exit(0);
}

let patched = 0;
for (const file of files) {
  const result = patchFile(file);
  const rel = path.relative(projectRoot, file);
  if (result === 'patched') {
    patched++;
    console.log(`  ✓ patched ${rel}`);
  } else if (result === 'already') {
    console.log(`  • already patched ${rel}`);
  } else {
    console.warn(`  ! anchor not found, skipped ${rel}`);
  }
}
console.log(`patch-aioncore-channels: ${patched} file(s) patched, ${files.length} total.`);
