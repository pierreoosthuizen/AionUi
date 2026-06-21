/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { fs } from '@/common/adapter/ipcBridge';
import {
  byName,
  CLAUDE_DIR,
  parseDescription,
  readAppliedProfiles,
  type SkillGroups,
  type SkillItem,
} from './useLoadedSkills';

/**
 * Resolve the slash-commands available to the embedded agent, grouped like
 * skills. Global commands live in `~/.claude/commands/*.md`; profile-scoped
 * commands in `~/.claude/profiles/commands/<profile>/*.md`. Each command is a
 * flat markdown file (name = filename without `.md`); its description comes from
 * the YAML frontmatter.
 */

const USER_COMMANDS_DIR = `${CLAUDE_DIR}/commands`;
const profileCommandsDir = (profile: string): string => `${CLAUDE_DIR}/profiles/commands/${profile}`;

async function scanCommands(dir: string): Promise<SkillItem[]> {
  let files: Array<{ name: string; fullPath: string; isFile: boolean }>;
  try {
    files = await fs.getFilesByDir.invoke({ dir, root: dir });
  } catch {
    return [];
  }
  const md = files.filter((f) => f.isFile && f.name.endsWith('.md'));
  const items = await Promise.all(
    md.map(async (f): Promise<SkillItem> => {
      const content = await fs.readFile.invoke({ path: f.fullPath }).catch((): null => null);
      return { name: f.name.replace(/\.md$/, ''), description: content ? parseDescription(content) : '' };
    })
  );
  return items.sort(byName);
}

// Static per session — scan each dir once and reuse.
let userScan: Promise<SkillItem[]> | null = null;
const profileScans = new Map<string, Promise<SkillItem[]>>();

function scanProfileCommands(profile: string): Promise<SkillItem[]> {
  let scan = profileScans.get(profile);
  if (!scan) {
    scan = scanCommands(profileCommandsDir(profile));
    profileScans.set(profile, scan);
  }
  return scan;
}

export function useLoadedCommands(workspace?: string): SkillGroups {
  const [groups, setGroups] = useState<SkillGroups>({ global: [], profiles: [] });
  useEffect(() => {
    let alive = true;
    userScan ??= scanCommands(USER_COMMANDS_DIR);
    const projectScan = workspace ? scanCommands(`${workspace}/.claude/commands`) : Promise.resolve<SkillItem[]>([]);
    const appliedScan = workspace ? readAppliedProfiles(workspace) : Promise.resolve<string[]>([]);
    void (async () => {
      const [user, project, applied] = await Promise.all([userScan, projectScan, appliedScan]);
      const profileEntries = await Promise.all(
        applied.toSorted().map(async (name) => ({ name, skills: await scanProfileCommands(name) }))
      );
      if (!alive) return;
      // Project-local wins over user-global on name collision.
      const merged = new Map<string, SkillItem>();
      for (const c of [...project, ...user]) if (!merged.has(c.name)) merged.set(c.name, c);
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
