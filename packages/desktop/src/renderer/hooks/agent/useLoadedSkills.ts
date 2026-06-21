/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';

/**
 * Resolve the skills the embedded Claude Code agent actually loaded for a
 * conversation. The agent runs with `--setting-sources=user,project,local`, so
 * its real skill set is the union of the user skills dir and the workspace's
 * `.claude/skills`. This replaces the GUI's old display of AionUi's bundled
 * auto-inject skills (aionui-skills, cron, officecli, skill-creator), which the
 * agent does not actually use.
 */

// ponytail: fork-local — home hardcoded (personal single-user fork), same as
// usePeerIdentity. Switch to a resolved home if this ever ships beyond this machine.
const USER_SKILLS_DIR = '/Users/pierreo/.claude/skills';

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

// User skills dir is static per session — scan once and reuse.
let userScan: Promise<string[]> | null = null;

export function useLoadedSkills(workspace?: string): string[] {
  const [skills, setSkills] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    userScan ??= scanNames(USER_SKILLS_DIR);
    const projectScan = workspace ? scanNames(`${workspace}/.claude/skills`) : Promise.resolve<string[]>([]);
    void Promise.all([userScan, projectScan]).then(([user, project]) => {
      if (!alive) return;
      setSkills(Array.from(new Set([...project, ...user])).sort());
    });
    return () => {
      alive = false;
    };
  }, [workspace]);
  return skills;
}
