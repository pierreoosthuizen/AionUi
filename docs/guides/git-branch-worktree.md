# Git branch switcher & worktree creation

When a conversation's workspace folder is a git repository, Agora shows branch
controls directly under the chat input: a branch switcher and a "create
worktree" button. They appear only for git repos and stay visible even when the
right-side panel is collapsed (the same reasoning behind placing the context bar
there).

## What it does

- **Branch chip** (`⎇ <branch>`) — click to open a dropdown of local branches
  (the current one is check-marked). Selecting a branch runs `git checkout` in
  the workspace folder.
- **Worktree button** (folder+) — opens a small modal asking for a branch name,
  then runs `git worktree add` into a sibling folder and repoints the
  conversation at the new worktree so the agent works there.

## Behavior & safeguards

- **Dirty-tree guard** — `git checkout` is refused if `git status --porcelain`
  is non-empty. Switching with uncommitted changes would silently carry them
  across, so the user is told to commit/stash or create a worktree instead. The
  UI surfaces this as a warning toast.
- **Worktree location** — sibling folder, auto-named:
  `<repo-parent>/<repo>-worktrees/<branch>`. Keeping worktrees outside the repo
  means they never show up as untracked files. Branch names are sanitized to a
  single safe path segment (`feature/login` → `feature-login`).
- **New vs existing branch** — if the requested branch already exists locally it
  is attached (`git worktree add <path> <branch>`); otherwise a new branch is
  created off `HEAD` (`git worktree add -b <branch> <path> HEAD`).
- **Workspace switch** — after a worktree is created the conversation's
  `extra.workspace` is updated (with `custom_workspace: true`) and the SWR cache
  + `acp.workspace.refresh` / `chat.history.refresh` events fire so the rest of
  the UI follows.

## Architecture

Git operations run in the **Electron main process** via the system `git` binary
(`execFile`), not through aioncore — aioncore detects repos and lists branches
but has no checkout/worktree endpoints. The main-process bridge mirrors the
existing `shellBridge` pattern.

```
renderer                                 main process
─────────────────────────────────────   ───────────────────────────────
WorkspaceGitControls (chip + modal)
  └─ useWorkspaceGit(conversation_id, workspace)
       ├─ ipcBridge.git.status      ──►  gitBridge: git -C <ws> rev-parse / branch / for-each-ref
       ├─ ipcBridge.git.checkout    ──►  gitBridge: status --porcelain guard → checkout
       └─ ipcBridge.git.createWorktree ─► gitBridge: worktree add (+ computeWorktreePath)
```

The `git` IPC service is a plain `export const` in `ipcBridge.ts`, so it is
auto-exposed as `ipcBridge.git` (the `common` barrel re-exports everything).
Handlers are registered by `initGitBridge()` from `bridge/index.ts` at startup.

## Files

| File | Role |
| --- | --- |
| `packages/desktop/src/process/utils/worktreePath.ts` | Pure helpers: `sanitizeBranchForPath`, `computeWorktreePath` |
| `packages/desktop/src/process/bridge/gitBridge.ts` | Native `git status` / `checkout` / `worktree add` providers |
| `packages/desktop/src/process/bridge/index.ts` | Wires `initGitBridge()` |
| `packages/desktop/src/common/adapter/ipcBridge.ts` | `git` service definition (`git:status`, `git:checkout`, `git:create-worktree`) |
| `packages/desktop/src/renderer/components/workspace-git/useWorkspaceGit.ts` | Hook: status + checkout + createWorktree actions |
| `packages/desktop/src/renderer/components/workspace-git/WorkspaceGitControls.tsx` | Branch dropdown + worktree button + modal |
| `packages/desktop/src/renderer/pages/conversation/platforms/acp/AcpSendBox.tsx` | Renders the controls beside the context bar |
| `packages/desktop/src/renderer/services/i18n/locales/en-US/conversation.json` | `conversation.git.*` strings |
| `tests/unit/process/worktreePath.test.ts` | Unit tests for the path helpers |

## Result contract

- `git.status` → `{ isRepo, currentBranch, branches }`
- `git.checkout` → `{ ok, error?: 'dirty' | 'failed', message? }`
- `git.createWorktree` → `{ ok, path?, branch?, message? }`

Errors are returned as result objects (not thrown) so the renderer maps them to
i18n toasts without relying on IPC error serialization.

## Limitations

- macOS-only path, shells out to the system `git` (a hard requirement for the
  feature). No libgit2 dependency.
- Only local branches are listed; no remote-tracking branch creation or fetch.
- The `execFile` providers run in the main process and are not covered by unit
  tests — only the pure path helpers are. They require a real build to exercise.
