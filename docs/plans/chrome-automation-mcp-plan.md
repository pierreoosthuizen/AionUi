# Plan: Browser automation in Agora (the "claude-in-chrome" requirement)

Status: approved approach — **Option B** (persistent dedicated logged-in Chrome via the existing `chrome-devtools` builtin MCP).
Date: 2026-06-22. Authors: Agora session + Forge (MCP/settings owner). Chrome on this machine: 149.

---

## 1. Why `claude-in-chrome` itself cannot be integrated

`claude-in-chrome` is **not a registerable MCP**. Verified from disk:

- It is browser-automation tooling **compiled into Anthropic's `claude` CLI binary**, bridged to the "Claude for Chrome" extension over **Chrome native messaging** (stdio, length-prefixed JSON), **origin-locked** to extension id `fcoeoabgfenejglbffodgkkbkcdhcgfn`.
  - Native host wrapper `~/.claude/chrome/chrome-native-host` → `exec ".../@anthropic-ai/claude-code/bin/claude.exe" --chrome-native-host`.
  - Manifest `…/NativeMessagingHosts/com.anthropic.claude_code_browser_extension.json`: `type:"stdio"`, `allowed_origins:["chrome-extension://fcoeoab…/"]`.
- There is **no stdio/sse/http endpoint** for Agora's backend (aioncore) to point a transport at.
- **Agora does not run the `claude` CLI.** Its agents run over ACP via `claude-agent-acp` 0.39.0 → `@anthropic-ai/claude-agent-sdk` 0.3.156 (the Agent SDK → API). Grep of the SDK's shipped files (`sdk.mjs`, `bridge.mjs`, `assistant.mjs`): `claude-in-chrome` / `chrome-native-host` / `nativeMessaging` = **0 hits**. So even the "Claude" agent in Agora has no access to those tools, and no flag ungates them — there is no CC binary under the hood.

**Conclusion:** integrating `claude-in-chrome` is structurally impossible. Reject it. Deliver the _capability_ (drive a browser, with logged-in state) another way.

## 2. The capability already ships in AionUi — disabled

`packages/desktop/src/process/utils/runBackendMigrations.ts` `buildDefaultMcpServers()` already seeds a builtin:

- `chrome-devtools` → `npx -y chrome-devtools-mcp@latest` (Google's official CDP/Puppeteer MCP)
- `builtin:true`, **`enabled:false`** (off by default), already **visible/toggleable** in Settings → Tools.
- Agora bundles its own Node runtime (`runtime/node/node-v24.11.0` + `_npx` cache), so the usual "npx not on PATH" failure is already handled.

That is why it "isn't working": it was never turned on, there is no UX nudge, and on a plain enable it launches a **blank fresh Chrome** (no login).

## 3. Why Option B (not A or C)

|                   | A: fresh Chrome                           | **B: dedicated logged-in Chrome** | C: extension drives real main Chrome    |
| ----------------- | ----------------------------------------- | --------------------------------- | --------------------------------------- |
| Login state       | none                                      | **persistent (log in once)**      | live existing sessions                  |
| Your main browser | n/a                                       | separate window                   | yes                                     |
| Build cost        | trivial (already redundant w/ lightpanda) | **small**                         | large + ongoing                         |
| Trust surface     | low                                       | **low (sandboxed profile)**       | high (`<all_urls>` ext in real profile) |
| Chrome 149        | ok                                        | **ok (dedicated dir)**            | fights platform hardening               |

- **A** is redundant — `lightpanda` already covers headless/no-login automation.
- **C** drives the literal running Chrome but needs a third-party extension (e.g. `mcp-chrome`) with broad perms inside the real profile → confused-deputy / prompt-injection blast radius across every logged-in tab, plus maintenance against Chrome auto-updates. Rejected.
- **B** keeps the small-diff Approach-A machinery, gives persistent logged-in automation in a sandboxed profile, stays on Chrome's supported/documented config. **Chosen.**

Chrome **149 ≥ 136** blocks remote-debugging on the **default** profile (anti-cookie-theft), so "drive my literal main signed-in Chrome via CDP" is impossible regardless. B sidesteps it by using a dedicated profile dir.

## 4. Key technical fact that makes B nearly free

`chrome-devtools-mcp` **already uses a persistent user-data-dir by default**: `$HOME/.cache/chrome-devtools-mcp/chrome-profile-$CHANNEL`, shared across runs, **not cleared** (clearing only happens with `--isolated`). When no `--browser-url`/`--wsEndpoint`/`--autoConnect` is passed it **launches and manages its own Chrome** on that persistent profile.

So B = "the builtin as already seeded (non-isolated) + turned on + a login-once UX." No separate launcher, no `--browser-url`, no quitting the user's Chrome, no Chrome-149 lockdown.

## 5. Implementation

All paths under `packages/desktop/src/`.

### 5.1 Pin + harden the seed — `process/utils/runBackendMigrations.ts` (`buildDefaultMcpServers`)

- Pin the version: `chrome-devtools-mcp@1.3.0` (drop `@latest` — removes per-spawn refetch / version drift / supply-chain surface; Forge flag #5). Bump deliberately.
- Keep it **non-isolated** (persistent profile — do NOT add `--isolated`).
- Optionally add `--channel=stable` for a predictable Chrome binary, and an explicit, documented `--user-data-dir=<agora-data>/chrome-automation-profile` so the logged-in profile lives in Agora's data dir (predictable, backup-able) instead of `~/.cache`.
- Leave `enabled:false` (opt-in is correct for a feature that launches a browser). Turnkey = easy to turn on, not auto-on.
- Default is headed — required so the user can complete logins. Do not force headless.

### 5.2 Settings UX — `renderer/pages/settings/ToolsSettings/` (`McpManagement.tsx`, `McpServerItem.tsx`)

- The server is already visible. Improve the description string to explain the flow: _"Enables browser automation. First run opens a dedicated Chrome window — sign in to the sites you want the agent to use; logins persist."_
- Optional: a small "Open automation browser to sign in" affordance that triggers the MCP to launch its window, so the user can log in before issuing a task. Cheapest version: rely on first task launching it.

### 5.3 i18n

- Add keys for the new description + any button label in `locales/` per the `i18n` skill. Run `bun run i18n:types` + `node scripts/check-i18n.js`.

### 5.4 (Optional, later) attach mode

- If a user ever wants CDP-attach to their own pre-launched Chrome, expose `--browser-url`; out of scope for B's default.

## 6. Verification

- Toggle on in Settings → Tools; confirm a headed Chrome window opens via the bundled node (no system npx needed).
- Sign into a site; restart Agora; re-run — confirm the session persisted (profile dir reused).
- Confirm the agent surfaces `chrome-devtools` tools and can `navigate`/read the page in that window.
- Confirm version is pinned (no network refetch of `@latest` on spawn).

## 7. Out of scope / rejected

- `claude-in-chrome` integration (impossible — §1).
- Option C extension-based MCP (trust/maintenance — §3).
- Driving the literal default Chrome profile via CDP (Chrome 149 lockdown — §3).

## 8. Effort

Small. Core change is a few lines in one seed function (pin + profile dir) plus a description/i18n string and verification. No new runtime deps (chrome-devtools-mcp already referenced; node already bundled).
