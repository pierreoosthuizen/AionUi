---
title: Agora — Architecture
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - architecture
---

# Agora — Architecture

## Overview

Agora is a Electron desktop application with two isolated processes communicating over an IPC bridge. A bundled `aioncore` binary runs as a local subprocess and exposes an HTTP API that the renderer queries for agent sessions, model availability, and ACP (Agent Client Protocol) handshakes.

## Processes

### Main Process (`packages/desktop/src/process/`)

- Node.js environment — no DOM APIs
- Manages the Electron app lifecycle, native menus, auto-updater
- Spawns and supervises the `aioncore` subprocess
- Owns SQLite database (metrics, conversations, config) via `better-sqlite3`
- Exposes IPC handlers to the renderer via the preload bridge

### Renderer Process (`packages/desktop/src/renderer/`)

- React 19 + Vite — no Node.js APIs
- Fetches agent/model data from aioncore via SWR (`DETECTED_AGENTS_SWR_KEY`)
- State: SWR cache + React context; no Redux
- UI: `@arco-design/web-react` components only; UnoCSS utilities

### Preload Bridge (`packages/desktop/src/preload/`)

- Contextual isolation boundary between main and renderer
- Exposes typed IPC calls via `window.bridge`

## aioncore

- Bundled binary at `resources/bundled-aioncore/darwin-arm64/` (gitignored build artifact)
- Version pinned in `scripts/prepare-aioncore.js`; downloaded from GitHub releases at build time
- Starts on a dynamic port; port communicated to renderer via IPC
- Exposes `/api/agents` → detected agent list with `handshake.available_models`

## ACP Plugin System

- Managed resources installed at `resources/local-managed-resources/acp/`
- Two plugins bundled: `codex-acp@0.16.0`, `claude-agent-acp@0.52.0`
- `prepareManagedResources()` in `prepare-aioncore.js` copies these into the `.app` bundle and runs `npm install --production`
- Model picker is entirely runtime-driven from the aioncore handshake — no hardcoded model list in renderer
- Cache cleared by `deploy.sh` to force re-install on each deploy

## Data Models

- **Conversations** — stored in SQLite; metrics tracked at 5-min cadence
- **Config** — `~/.aionui-config-dev/` (dev) or `~/Library/Application Support/Agora/` (prod)
- **Metrics** — `metrics.db` at `~/Library/Application Support/AionUi/metrics.db`

## Integrations

- **Anthropic Claude** — via `@anthropic-ai/sdk`
- **ACP agents** — Claude Code (`claude-agent-acp`), Codex (`codex-acp`)
- **Extension Hub** — `resources/hub/` (local build artifact; not tracked in git)
- **Auto-updater** — `electron-updater`; update channel from `electron-builder.yml`

## Deployment

- macOS arm64 only (personal build)
- Fast deploy: `scripts/deploy.sh "commit message"` → tsc → push → dir-build → `/Applications`
- Full deploy: `scripts/deploy.sh --full` → full gate (lint/format/test) → DMG/zip
- Signed with Apple Development identity; notarization skipped (personal use)
- Build script: `scripts/build-with-builder.js`, afterPack hook bundles aioncore

---

## Related Documents

- [[PROJECT]] — Risks, tasks, milestones
- [[DECISIONS]] — Architecture Decision Records
- [[DOMAIN]] — Business domain and glossary
- [[TOOLS]] — Tools and frameworks
