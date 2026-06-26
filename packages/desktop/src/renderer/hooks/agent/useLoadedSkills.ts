/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';
import { cycleSkillState, loadSkillOverrides, stateFromLiteral, type SkillState } from './skillOverrides';

export type { SkillState };

/**
 * Resolve the skills the embedded Claude Code agent actually loaded for a
 * conversation, grouped by origin. The agent runs with
 * `--setting-sources=user,project,local`, so its real skill set is the union of
 * the user skills dir and the workspace's `.claude/skills` (the `global` group).
 *
 * Profile-scoped skills live under `~/.claude/profiles/skills/<profile>/` and a
 * workspace declares which profiles it uses in `.claude/profiles-applied.json`
 * (`{ profiles: string[] }`). Each applied profile becomes its own group.
 */

// ponytail: fork-local — home hardcoded (personal single-user fork), same as
// usePeerIdentity. Switch to a resolved home if this ever ships beyond this machine.
export const CLAUDE_DIR = '/Users/pierreo/.claude';
const USER_SKILLS_DIR = `${CLAUDE_DIR}/skills`;
const profileSkillsDir = (profile: string): string => `${CLAUDE_DIR}/profiles/skills/${profile}`;

// ADR-0003 §5: optional state/location/locked. Skills carry them; Commands/MCP
// rows leave them undefined and render exactly as before (no fork of ItemRow).
export type SkillLocation = 'user' | 'project';
export type SkillItem = {
  name: string;
  description: string;
  /** Present only for skill rows → ItemRow renders a glyph + click-cycles. */
  state?: SkillState;
  location?: SkillLocation;
  /** Plugin-origin skills are read-only; cycle hard-skips them (v1: never set —
   *  plugin skills are not scanned, so they're simply absent from the tab). */
  locked?: boolean;
};

export type SkillGroups = {
  /** User-global + workspace-local skills (always active). */
  global: SkillItem[];
  /** One entry per applied profile, in name order. */
  profiles: Array<{ name: string; skills: SkillItem[] }>;
};

/** ADR-0003 §3: skills grouped by file-path root (user / project), plus the
 *  click-cycle that persists state to `.claude/settings.local.json`. */
export type LoadedSkills = {
  user: SkillItem[];
  project: SkillItem[];
  /** Advance a skill's state and persist it; rejects if the write is refused. */
  cycle: (item: SkillItem) => Promise<void>;
};

// The backend `/api/skills/scan` envelope is `{ skills: [...] }`; the bridge's
// declared return type is stale (says bare array), so read `.skills` defensively.
type ScanResult = { skills?: Array<{ name?: string; description?: string }> };

export const byName = (a: SkillItem, b: SkillItem): number => a.name.localeCompare(b.name);

// The aioncore scanner mis-parses YAML block scalars: a `description: >` (folded)
// or `description: |` (literal) frontmatter yields just the bare indicator. Detect
// that (and empty) so we can repair it by reading the SKILL.md ourselves.
const isBadDesc = (d: string): boolean => d.trim() === '' || /^[>|][+-]?\d*$/.test(d.trim());

// Minimal frontmatter `description:` extractor — handles inline, quoted, and
// block-scalar (`>` / `|`) forms. Good enough for a tooltip; not a full YAML parser.
export function parseDescription(md: string): string {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return '';
  const lines = fm[1].split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith('description:'));
  if (idx === -1) return '';
  const inline = lines[idx].replace(/^description:\s*/, '').trim();
  if (/^[>|][+-]?\d*$/.test(inline)) {
    const block: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (/^\s+\S/.test(lines[i]) || lines[i].trim() === '') block.push(lines[i].trim());
      else break;
    }
    return block.join(' ').replace(/\s+/g, ' ').trim();
  }
  return inline.replace(/^["']|["']$/g, '');
}

async function scanSkills(dir: string): Promise<SkillItem[]> {
  let raw: SkillItem[];
  try {
    const res = (await fs.scanForSkills.invoke({ folder_path: dir })) as unknown as ScanResult;
    raw = (res?.skills ?? [])
      .filter((s): s is { name: string; description?: string } => !!s.name)
      .map((s) => ({ name: s.name, description: s.description ?? '' }));
  } catch {
    return [];
  }
  // Repair only the broken ones — read & parse `<dir>/<name>/SKILL.md`.
  return Promise.all(
    raw.map(async (s): Promise<SkillItem> => {
      if (!isBadDesc(s.description)) return s;
      const md = await fs.readFile.invoke({ path: `${dir}/${s.name}/SKILL.md` }).catch((): null => null);
      return { name: s.name, description: (md && parseDescription(md)) || s.description };
    })
  );
}

export async function readAppliedProfiles(workspace: string): Promise<string[]> {
  try {
    const raw = await fs.readFile.invoke({ path: `${workspace}/.claude/profiles-applied.json` });
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { profiles?: unknown };
    return Array.isArray(parsed.profiles) ? parsed.profiles.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

// Per-session scan cache, keyed by directory. ISS-013: an EMPTY result is NOT
// retained — at cold start the backend HTTP server may not be up yet, so the scan
// resolves `[]`; caching that would hide skills for the whole session. Dropping the
// empty entry lets the next mount (or the retry below) re-scan once the backend is
// ready. Non-empty scans are reused as before.
const scanCache = new Map<string, Promise<SkillItem[]>>();

/** REQ-027: drop every cached scan so the next mount/epoch re-scans from disk.
 *  Synchronous Map.clear() — race-safe (no awaited state), reused by ADR-0014. */
export function clearSkillScanCache(): void {
  scanCache.clear();
}

function cachedScan(dir: string): Promise<SkillItem[]> {
  let scan = scanCache.get(dir);
  if (!scan) {
    scan = scanSkills(dir).then((skills) => {
      if (skills.length === 0) scanCache.delete(dir);
      return skills;
    });
    scanCache.set(dir, scan);
  }
  return scan;
}

function scanProfile(profile: string): Promise<SkillItem[]> {
  return cachedScan(profileSkillsDir(profile));
}

/** `epoch` is the REQ-027 refresh nonce: callers `clearSkillScanCache()` then bump
 *  it to force the scan effect to re-run against a now-empty cache. */
export function useLoadedSkills(workspace?: string, epoch = 0): LoadedSkills {
  // Raw scan (origin-tagged, no state yet); state is layered on from overrides.
  const [raw, setRaw] = useState<{ user: SkillItem[]; project: SkillItem[] }>({ user: [], project: [] });
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // ISS-013: bounded self-heal so a Skills tab left open during cold start refreshes
  // once the backend comes up, instead of showing an empty list until remount.
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (epoch > 0) clearSkillScanCache();
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const userScan = cachedScan(USER_SKILLS_DIR);
    const projectScan = workspace ? cachedScan(`${workspace}/.claude/skills`) : Promise.resolve<SkillItem[]>([]);
    const appliedScan = workspace ? readAppliedProfiles(workspace) : Promise.resolve<string[]>([]);
    void (async () => {
      const [user, project, applied] = await Promise.all([userScan, projectScan, appliedScan]);
      const profileSkills = (await Promise.all(applied.toSorted().map(scanProfile))).flat();
      if (!alive) return;
      // ADR-0003 §3: group by file-path root. user + profile dirs both live under
      // ~/.claude → the user bucket; workspace/.claude/skills → the project bucket.
      // Project still wins on name collision, so a shadowed user skill drops out.
      // PINNED (ADR-0003 §3 amendment): we classify by SCAN ORIGIN, not by parsing
      // each skill's path. Safe because profileSkillsDir is hardcoded under
      // ~/.claude → profile skills are always User. If a profile path ever resolves
      // in-workspace, switch this to path-root classification (s.path startsWith
      // CLAUDE_DIR ? user : project).
      const projectNames = new Set(project.map((s) => s.name));
      const userMerged = new Map<string, SkillItem>();
      for (const s of [...user, ...profileSkills])
        if (!projectNames.has(s.name) && !userMerged.has(s.name)) userMerged.set(s.name, s);
      const projectMerged = new Map<string, SkillItem>();
      for (const s of project) if (!projectMerged.has(s.name)) projectMerged.set(s.name, s);
      setRaw({
        user: Array.from(userMerged.values()).toSorted(byName),
        project: Array.from(projectMerged.values()).toSorted(byName),
      });

      if (user.length === 0 && project.length === 0 && profileSkills.length === 0 && retry < 5) {
        retryTimer = setTimeout(() => setRetry((r) => r + 1), 1500);
      }
    })();
    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
    // `epoch` is an intentional refresh nonce: it carries no value into the effect
    // body but its change must re-run the (now cache-cleared) scan. ISS-013 retry
    // self-heal and workspace switch are the other re-run triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, retry, epoch]);

  // Persisted enable-states, reloaded after every cycle so the row reflects disk.
  const reloadOverrides = useCallback(async () => {
    setOverrides(workspace ? await loadSkillOverrides(workspace) : {});
  }, [workspace]);
  useEffect(() => {
    void reloadOverrides();
  }, [reloadOverrides]);

  const withState = useCallback(
    (items: SkillItem[], location: SkillLocation): SkillItem[] =>
      items.map((s) => ({ ...s, location, state: stateFromLiteral(overrides[s.name]) })),
    [overrides]
  );
  const user = useMemo(() => withState(raw.user, 'user'), [raw.user, withState]);
  const project = useMemo(() => withState(raw.project, 'project'), [raw.project, withState]);

  const cycle = useCallback(
    async (item: SkillItem) => {
      // No workspace → no write target; locked (plugin) → read-only; no state → not a skill row.
      if (!workspace || item.locked || !item.state) return;
      await cycleSkillState(workspace, item.name, item.state);
      await reloadOverrides();
    },
    [workspace, reloadOverrides]
  );

  return { user, project, cycle };
}
