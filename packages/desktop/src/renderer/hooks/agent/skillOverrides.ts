/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fs } from '@/common/adapter/ipcBridge';

/**
 * Skill enable-state cycle + persistence (ADR-0003 §1/§2).
 *
 * The visible 4-state model maps to Claude Code's own `skillOverrides` literals
 * in `.claude/settings.local.json` (CC ≥ v2.1.129). Agora is a SECOND writer of
 * a CC-owned file, so it must stay literal-compatible or CC will misread it:
 *   on        → key ABSENT (never store an "on" literal — matches CC's default)
 *   name-only → "name-only"
 *   user-only → "user-invocable-only"  (UI label "user-only", persisted literal)
 *   off       → "off"
 *
 * Write discipline (load-bearing — settings loss is data loss):
 *  - read-modify-write ONLY skillOverrides[name]; every other key preserved.
 *  - missing/empty file → treat as {}, create on first write.
 *  - existing but UNPARSEABLE → ABORT, never overwrite (malformed ≠ missing;
 *    blindly writing over JSON we failed to parse is the real data-loss path).
 *
 * ponytail: plain write, not crash-atomic; <2KB gitignored prefs file, sub-ms
 * truncation window, matches peerTaskStore (the app's own JSON-store bar).
 * Upgrade = main-process fs.writeFileAtomic (temp-same-dir + renameSync
 * overwrite, ~30 lines) if it ever bites.
 */

export type SkillState = 'on' | 'name-only' | 'user-only' | 'off';

// UI state → persisted CC literal. `on` is absence, so it has no literal.
const STATE_TO_LITERAL: Record<Exclude<SkillState, 'on'>, string> = {
  'name-only': 'name-only',
  'user-only': 'user-invocable-only',
  off: 'off',
};

// Persisted literal → UI state. Anything unrecognised → `on` (don't misrepresent
// a future/unknown CC literal as a disabled state).
export function stateFromLiteral(literal: string | undefined): SkillState {
  switch (literal) {
    case 'name-only':
      return 'name-only';
    case 'user-invocable-only':
      return 'user-only';
    case 'off':
      return 'off';
    default:
      return 'on';
  }
}

// Click-cycle order, mirroring the CLI: on → name-only → user-only → off → on.
const CYCLE: SkillState[] = ['on', 'name-only', 'user-only', 'off'];
export function nextState(current: SkillState): SkillState {
  const i = CYCLE.indexOf(current);
  return CYCLE[(i + 1) % CYCLE.length];
}

type Settings = Record<string, unknown>;
type ParseResult = { ok: true; value: Settings } | { ok: false };

// Plain JSON object only. null/empty → {}. A parse throw OR a non-object
// (array/primitive) → not-ok, so the caller refuses to overwrite it.
export function parseSettings(raw: string | null | undefined): ParseResult {
  if (raw == null || raw.trim() === '') return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false };
    return { ok: true, value: parsed as Settings };
  } catch {
    return { ok: false };
  }
}

// Pure read-modify-write of a single override. Returns a NEW settings object with
// every unrelated key preserved; only skillOverrides[name] is set or deleted.
export function applyOverride(settings: Settings, name: string, next: SkillState): Settings {
  const prev = settings.skillOverrides;
  const overrides: Record<string, string> =
    prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as Record<string, string>) } : {};
  if (next === 'on') delete overrides[name];
  else overrides[name] = STATE_TO_LITERAL[next];
  return { ...settings, skillOverrides: overrides };
}

const settingsPath = (workspace: string): string => `${workspace}/.claude/settings.local.json`;

export function readSkillOverrides(raw: string | null): Record<string, string> {
  const res = parseSettings(raw);
  if (!res.ok) return {};
  const ovr = res.value.skillOverrides;
  return ovr && typeof ovr === 'object' && !Array.isArray(ovr) ? (ovr as Record<string, string>) : {};
}

/** Load the current skillOverrides map for a workspace (best-effort, never throws). */
export async function loadSkillOverrides(workspace: string): Promise<Record<string, string>> {
  const raw = await fs.readFile.invoke({ path: settingsPath(workspace) }).catch((): null => null);
  return readSkillOverrides(raw);
}

/**
 * Persist a single skill's next state. Reads current settings, refuses to write
 * over an unparseable file (throws), mutates only skillOverrides[name], writes
 * back. Returns the state actually persisted.
 */
export async function cycleSkillState(workspace: string, name: string, current: SkillState): Promise<SkillState> {
  const next = nextState(current);
  const raw = await fs.readFile.invoke({ path: settingsPath(workspace) }).catch((): null => null);
  const parsed = parseSettings(raw);
  if (!parsed.ok) {
    throw new Error(
      `Refusing to write: ${settingsPath(workspace)} is not valid JSON (would clobber existing settings).`
    );
  }
  const nextSettings = applyOverride(parsed.value, name, next);
  const ok = await fs.writeFile.invoke({
    path: settingsPath(workspace),
    data: `${JSON.stringify(nextSettings, null, 2)}\n`,
  });
  if (!ok) throw new Error(`Failed to write ${settingsPath(workspace)}`);
  return next;
}
