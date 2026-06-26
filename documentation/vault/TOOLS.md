---
title: Agora — Tools
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - tools
---

# Agora — Tools & Automation

## Frameworks & Libraries

| Tool | Version | Purpose |
| ---- | ------- | ------- |
| Electron | ^37.10.3 | Desktop shell |
| electron-vite | ^5.0.0 | Build orchestration (main + preload + renderer) |
| electron-builder | 26.15.2 | Packaging, DMG, code signing |
| React | ^19.1.0 | Renderer UI |
| @arco-design/web-react | ^2.66.1 | UI component library |
| @icon-park/react | ^1.4.2 | Icon set |
| UnoCSS | ^66.3.3 | Utility CSS |
| SWR | ^2.3.6 | Data fetching / caching (agent/model data) |
| better-sqlite3 | ^12.4.1 | SQLite — conversations, metrics, config |
| electron-updater | ^6.6.2 | Auto-update |
| electron-log | ^5.4.3 | Logging |
| Vitest | ^4.0.18 | Unit + integration tests |
| oxlint | ^1.56.0 | Linter |
| oxfmt | ^0.41.0 | Formatter |
| TypeScript | ^5.8.3 | Type system |
| Bun | (runtime) | Package manager + test runner |
| i18next | ^23.7.16 | i18n (EN-only in Agora; frozen) |

## ACP / Backend

| Component | Version | Purpose |
| --------- | ------- | ------- |
| aioncore | v0.1.35 | Local AI coordination subprocess |
| claude-agent-acp | 0.52.0 | Claude Code ACP plugin (bundled) |
| codex-acp | 0.16.0 | Codex ACP plugin (bundled) |
| @agentclientprotocol/sdk | ^0.18.2 | ACP client SDK |

## Claude Skills Used

| Skill | Purpose |
| ----- | ------- |
| `architecture` | Guides file/module creation |
| `i18n` | i18n key management |
| `testing` | TDD workflow |
| `oss-pr` | PR creation gate |
| `bump-version` | Semver version bumps |
| `create-document-vault` | Vault init and doc mode |
| `gitnexus` | GitNexus impact/rename queries |

## Claude Plugins / MCPs

| Plugin / MCP | Purpose |
| ------------ | ------- |
| claude-peers | Inter-session peer messaging |
| context7 | Library documentation lookup |
| gitnexus | Code graph queries |
| ollama | Local LLM delegation (qwen2.5-coder:32b) |
| context-mode | Context window compression |
| vault-search-agent | Second Brain vault queries |

## Scripts & Automation

| Script | Location | Purpose |
| ------ | -------- | ------- |
| `deploy.sh` | `scripts/deploy.sh` | Fast/full build + install + relaunch |
| `prepare-aioncore.js` | `packages/shared-scripts/src/` | Download aioncore + bundle managed resources |
| `build-with-builder.js` | `scripts/` | Electron-builder wrapper with --force flag |
| `generate-i18n-types.js` | `scripts/` | i18n type generation |
| `check-i18n.js` | `scripts/` | i18n key coverage check |
| `postinstall.js` | `scripts/` | Post-`bun install` setup |
| `justfile` | root | Task runner (`just push`, `just test`, etc.) |

## Vault Index

| Document | Purpose |
| -------- | ------- |
| [[ARCHITECTURE]] | System design, components, data models |
| [[DECISIONS]] | Architecture Decision Records |
| [[DOMAIN]] | Business domain, personas, glossary |
| [[PROJECT]] | Risks, issues, tasks, milestones |
| [[UI-DESIGN]] | Design system, screens, UX flows |
| [[LOGGING]] | Logging strategy and rules |
| [[TOOLS]] | This document |
| [[LEGAL]] | Copyright and licences |

---

## Related Documents

- [[PROJECT]] — Project context
- [[ARCHITECTURE]] — Technical environment
