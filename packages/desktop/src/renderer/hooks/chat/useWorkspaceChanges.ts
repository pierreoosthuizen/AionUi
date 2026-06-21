/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { addEventListener } from '@/renderer/utils/emitter';
import { useEffect, useState } from 'react';

type WorkspaceChanges = {
  count: number;
  branch: string | null;
  /** 'git-repo' when the workspace is a real git repo (commit is meaningful). */
  mode: string;
};

const EMPTY: WorkspaceChanges = { count: 0, branch: null, mode: '' };

/**
 * Read-only view of the workspace's change count + branch for the commit bar.
 * Uses `getInfo`/`compare` only — never `init`/`dispose` — so it does NOT
 * interfere with the Workspace panel's `useFileChanges`, which owns the snapshot
 * lifecycle. If the snapshot isn't initialized yet, calls fail quietly and the
 * bar stays hidden. Polls on an interval and on workspace-refresh events.
 *
 * ponytail: 4s poll. Fine for a local app; switch to a push event if the
 * backend ever emits snapshot-changed.
 */
export function useWorkspaceChanges(workspace?: string): WorkspaceChanges {
  const [state, setState] = useState<WorkspaceChanges>(EMPTY);

  useEffect(() => {
    if (!workspace) {
      setState(EMPTY);
      return;
    }
    let alive = true;
    const refresh = async () => {
      try {
        const [info, cmp] = await Promise.all([
          ipcBridge.fileSnapshot.getInfo.invoke({ workspace }),
          ipcBridge.fileSnapshot.compare.invoke({ workspace }),
        ]);
        if (alive) setState({ branch: info.branch, mode: info.mode, count: cmp.staged.length + cmp.unstaged.length });
      } catch {
        if (alive) setState(EMPTY);
      }
    };
    void refresh();
    const id = setInterval(refresh, 4000);
    const off = addEventListener('acp.workspace.refresh', refresh);
    return () => {
      alive = false;
      clearInterval(id);
      off();
    };
  }, [workspace]);

  return state;
}
