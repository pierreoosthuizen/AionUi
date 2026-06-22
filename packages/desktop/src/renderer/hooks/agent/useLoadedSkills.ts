/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';

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

export type SkillItem = { name: string; description: string };

export type SkillGroups = {
  /** User-global + workspace-local skills (always active). */
  global: SkillItem[];
  /** One entry per applied profile, in name order. */
  profiles: Array<{ name: string; skills: SkillItem[] }>;
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

// Static per session — scan each dir once and reuse.
let userScan: Promise<SkillItem[]> | null = null;
const profileScans = new Map<string, Promise<SkillItem[]>>();

function scanProfile(profile: string): Promise<SkillItem[]> {
  let scan = profileScans.get(profile);
  if (!scan) {
    scan = scanSkills(profileSkillsDir(profile));
    profileScans.set(profile, scan);
  }
  return scan;
}

export function useLoadedSkills(workspace?: string): SkillGroups {
  const [groups, setGroups] = useState<SkillGroups>({ global: [], profiles: [] });
  useEffect(() => {
    let alive = true;
    userScan ??= scanSkills(USER_SKILLS_DIR);
    const projectScan = workspace ? scanSkills(`${workspace}/.claude/skills`) : Promise.resolve<SkillItem[]>([]);
    const appliedScan = workspace ? readAppliedProfiles(workspace) : Promise.resolve<string[]>([]);
    void (async () => {
      const [user, project, applied] = await Promise.all([userScan, projectScan, appliedScan]);
      const profileEntries = await Promise.all(
        applied.toSorted().map(async (name) => ({ name, skills: (await scanProfile(name)).toSorted(byName) }))
      );
      if (!alive) return;
      // Project-local wins over user-global on name collision.
      const merged = new Map<string, SkillItem>();
      for (const s of [...project, ...user]) if (!merged.has(s.name)) merged.set(s.name, s);
      setGroups({
        global: Array.from(merged.values()).sort(byName),
        profiles: profileEntries.filter((p) => p.skills.length > 0),
      });
    })();
    return () => {
      alive = false;
    };
  }, [workspace]);
  return groups;
}
