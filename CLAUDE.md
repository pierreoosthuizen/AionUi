# Agora — Project Guide

Private personal project — not open-source, single maintainer (Pierre). Conventions keep the codebase sane, not to onboard outsiders.

## Code Conventions

**Structure** — Max **10** direct children per directory; split by responsibility near the limit. Full rules: [docs/contributing/file-structure.md](docs/contributing/file-structure.md). Follow the `architecture` skill when creating files/modules.

**Naming** — Components PascalCase (`Button.tsx`); utilities camelCase (`formatDate.ts`); hooks `use`-prefixed (`useTheme.ts`); constants/type files camelCase (values UPPER*SNAKE_CASE); style files kebab-case or `Name.module.css`; unused params `*`-prefixed.

**UI** — `@arco-design/web-react` only; no raw interactive HTML (`<button>`/`<input>`/`<select>`). Icons: `@icon-park/react`.

**CSS** — UnoCSS utilities first; complex → CSS Modules (`Name.module.css`). Colors via semantic tokens (`uno.config.ts` / CSS vars), never hardcoded. Arco overrides → `renderer/styles/arco-override.css`; component-scoped via CSS Module `:global()`. Global styles only in `renderer/styles/`.

**Formatting** (Oxfmt) — single-element arrays inline; trailing commas in multi-line; single quotes.

**TypeScript** — strict; no `any`, no implicit returns. Path aliases `@/*`, `@process/*`, `@renderer/*`. Prefer `type` over `interface`. English comments; JSDoc on public functions.

**i18n** — all user-facing text via i18n keys, never hardcoded. Config: `packages/desktop/src/common/config/i18n-config.json`. See `i18n` skill.

## Architecture

Two processes, never mix APIs:

- **Main** `packages/desktop/src/process/` — no DOM APIs
- **Renderer** `packages/desktop/src/renderer/` — no Node.js APIs

Cross-process via IPC bridge (`packages/desktop/src/preload/`). Detail: [docs/architecture/overview.md](docs/architecture/overview.md).

## Testing

Vitest 4, coverage ≥ 80%. `bun run test` / `bun run test:coverage`. See `testing` skill.

## Workflow

**During dev** — `bun run lint:fix`, `bun run format`, `bunx tsc --noEmit`. If touching `renderer/`, `locales/`, or `common/config/i18n`, also run `bun run i18n:types` && `node scripts/check-i18n.js`.

**Before push** — `just push` (lint → format-check → typecheck → test → push); any failure aborts. Lint runs `--quiet`, so only errors fail — pre-existing _warnings_ are not failures; judge by exit code, not output volume.

**Before PR (optional)** — `prek run --from-ref origin/main --to-ref HEAD` replicates exact CI (read-only; reports, doesn't fix). The `oss-pr` skill runs it during PR creation.

**Commits** — `<type>(<scope>): <subject>`, English (feat|fix|refactor|chore|docs|test|style|perf). **NEVER add AI signatures** (Co-Authored-By, Generated with, etc.). PRs: see `oss-pr` skill.

## Local Agent Delegation (Ollama)

**Mandate.** Claude does not write feature code directly — it instructs local Ollama agents (`qwen2.5-coder:32b`; tiers in `~/.claude/CLAUDE.md`), reviews, advises changes. Direct implementation only when delegation is impossible (Ollama unreachable) — record why.

- One bounded task per round.
- Claude validates every change before it lands (typecheck + tests). No unvalidated output commits.
- Log each delegation in [docs/ollama-agent-efficacy.md](docs/ollama-agent-efficacy.md): task, model, rounds, verdict.
- **Trivial-edit carve-out** — Claude edits directly (no delegation) for one-liners, string/const/config changes, typos, mechanical renames, import tweaks, any change under ~20 lines of logic. Delegate only substantive logic (new functions, multi-branch flow, algorithms).

## Skills

In `.claude/skills/`, apply to all agents, self-describing — invoke by name on trigger: `architecture`, `i18n`, `testing`, `oss-pr`, `bump-version`, and the `pr-*` family (`pr-review`, `pr-fix`, `pr-verify`, `pr-ship`, `pr-automation`).

## Code Intelligence (GitNexus — optional)

Repo indexed by GitNexus; tools (`gitnexus_impact`, `_detect_changes`, `_query`, `_context`, `_rename`) available but **not mandated** — Pierre indexes manually (`npx gitnexus analyze`). Use on substantive changes: impact before editing an exported/widely-called symbol, crossing the main↔renderer boundary, or a signature change; `_rename` over find-and-replace on real symbols. Skip for trivial/local edits. Usage: `.claude/skills/gitnexus/`.
