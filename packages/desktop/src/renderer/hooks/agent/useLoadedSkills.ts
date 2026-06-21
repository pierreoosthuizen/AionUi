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
const CLAUDE_DIR = '/Users/pierreo/.claude';
const USER_SKILLS_DIR = `${CLAUDE_DIR}/skills`;
const profileSkillsDir = (profile: string): string => `${CLAUDE_DIR}/profiles/skills/${profile}`;

export type SkillGroups = {
  /** User-global + workspace-local skills (always active). */
  global: string[];
  /** One entry per applied profile, in name order. */
  profiles: Array<{ name: string; skills: string[] }>;
};

// The backend `/api/skills/scan` envelope is `{ skills: [...] }`; the bridge's
// declared return type is stale (says bare array), so read `.skills` defensively.
type ScanResult = { skills?: Array<{ name?: string }> };

function scanNames(dir: string): Promise<string[]> {
  return fs.scanForSkills
    .invoke({ folder_path: dir })
    .then((res): string[] =>
      ((res as unknown as ScanResult)?.skills ?? []).map((s) => s.name).filter((n): n is string => !!n)
    )
    .catch((): string[] => []);
}

async function readAppliedProfiles(workspace: string): Promise<string[]> {
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
let userScan: Promise<string[]> | null = null;
const profileScans = new Map<string, Promise<string[]>>();

function scanProfile(profile: string): Promise<string[]> {
  let scan = profileScans.get(profile);
  if (!scan) {
    scan = scanNames(profileSkillsDir(profile));
    profileScans.set(profile, scan);
  }
  return scan;
}

export function useLoadedSkills(workspace?: string): SkillGroups {
  const [groups, setGroups] = useState<SkillGroups>({ global: [], profiles: [] });
  useEffect(() => {
    let alive = true;
    userScan ??= scanNames(USER_SKILLS_DIR);
    const projectScan = workspace ? scanNames(`${workspace}/.claude/skills`) : Promise.resolve<string[]>([]);
    const appliedScan = workspace ? readAppliedProfiles(workspace) : Promise.resolve<string[]>([]);
    void (async () => {
      const [user, project, applied] = await Promise.all([userScan, projectScan, appliedScan]);
      const profileEntries = await Promise.all(
        applied.toSorted().map(async (name) => ({ name, skills: (await scanProfile(name)).toSorted() }))
      );
      if (!alive) return;
      setGroups({
        global: Array.from(new Set([...project, ...user])).toSorted(),
        profiles: profileEntries.filter((p) => p.skills.length > 0),
      });
    })();
    return () => {
      alive = false;
    };
  }, [workspace]);
  return groups;
}
