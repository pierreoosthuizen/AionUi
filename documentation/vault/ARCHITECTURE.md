---
title: Agora — Architecture
version: 1.1
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - architecture
---

# Agora — Architecture

> **Index note:** GitNexus graph is 26 commits behind HEAD (last indexed: `a6fcab5`).
> Stats below reflect the graph at that commit: 1,284 files · 23,369 symbols · 300 processes.
> Re-index: `npx gitnexus analyze`

## Overview

Agora is an Electron desktop application with two strictly isolated processes — **Main** (Node.js) and **Renderer** (React) — connected via an IPC preload bridge. A bundled `aioncore` subprocess runs locally and serves as the AI coordination backend over HTTP. The renderer never calls Node.js APIs directly; the main process never touches the DOM.

---

## System Diagram

```mermaid
graph TD
    subgraph Renderer["Renderer Process (React/Vite)"]
        direction TB
        Chat["Chat / ACP Send Box"]
        Hooks["Hooks (SWR, state)"]
        Components["UI Components (Arco)"]
        Sider["Sidebar (Skills, History)"]
        Adapter["HTTP Adapter (httpBridge)"]
        ConfigSvc["configService"]
    end

    subgraph Preload["Preload (IPC Bridge)"]
        Bridge["window.bridge"]
    end

    subgraph Main["Main Process (Node.js)"]
        Services["Services (DB, auth, settings)"]
        Runtime["Runtime Manager"]
        System["System (auto-update, menus)"]
        Channels["Remote Channels (Telegram, DingTalk, WeChat, Lark)"]
    end

    subgraph Backend["aioncore Subprocess"]
        ACP["ACP Plugin Host"]
        ClaudeACP["claude-agent-acp"]
        CodexACP["codex-acp"]
        ACP --> ClaudeACP
        ACP --> CodexACP
    end

    Chat -->|HTTP GET /api/agents| Adapter
    Chat -->|HTTP POST /api/sessions| Adapter
    Adapter -->|getBackendPort()| Backend
    ConfigSvc -->|getBaseUrl()| Backend
    Hooks -->|SWR DETECTED_AGENTS_SWR_KEY| Adapter
    Chat -->|IPC| Bridge
    Sider -->|IPC| Bridge
    Bridge <-->|contextBridge| Main
    Main -->|spawn / supervise| Backend
    Runtime -->|port assignment| Services
    Channels -->|remote messages| Services
```

---

## Functional Clusters (from GitNexus)

| Cluster | Symbols | Cohesion | Responsibility |
| ------- | ------- | -------- | -------------- |
| **Hooks** | 236 | 82% | React hooks — SWR data fetching, agent state, model selection |
| **Components** | 201 | 80% | Shared UI components (buttons, modals, inputs) |
| **Scripts** | 189 | 86% | Build scripts — prepare-aioncore, electron-builder wrappers |
| **Chat** | 186 | 81% | Conversation UI — message list, send boxes (ACP + AionRS), history |
| **Agent** | 157 | 81% | Agent detection, preset info, avatar resolution, lifecycle |
| **Specs** | 111 | 94% | Unit + integration tests (Vitest) |
| **Bridge** | 107 | 80% | IPC bridge — preload exposures, type-safe channel contracts |
| **Services** | 98 | 84% | Main-process services — database, auth, config, LLM clients |
| **Channels** | 89 | 88% | Remote channel integrations (Telegram, DingTalk, WeChat, Lark) |
| **Acp** | 72 | 79% | ACP protocol — model selector, session management, handshake parsing |
| **Api** | 64 | 85% | LLM API clients (Anthropic, OpenAI, Bedrock, Gemini) |
| **Pet** | 61 | 75% | Pet state animation system (idle, building, carrying, etc.) |
| **Contents** | 59 | 75% | Content rendering — markdown, code, KaTeX, Mermaid |
| **System** | 56 | 90% | System integration — auto-update, native menus, OS notifications |
| **Adapter** | 56 | 83% | HTTP adapter layer — `httpBridge.ts`, `getBackendPort`, `getBaseUrl` |
| **File** | 52 | 85% | File handling — uploads, previews, office doc parsing |
| **Messages** | 51 | 87% | Message type definitions and serialization |
| **Ui** | 51 | 89% | UI primitives — theme tokens, semantic CSS vars, layout helpers |
| **Sider** | 47 | 88% | Sidebar — skills browser, conversation history, peer list |
| **Runtime** | 45 | 98% | Runtime management — aioncore lifecycle, port assignment |

---

## Key Execution Flows

### 1 — Message send (ACP path)

User submits a message in the ACP chat box:

```
AcpSendBox.executeCommand
  → conversationCreateError.getConversationRuntimeWorkspaceErrorMessage
    → normalizeConversationRuntimeWorkspaceErrorCode
      → normalizeWorkspacePathErrorCode
        → getWorkspacePathErrorPayload
          → getEmbeddedBackendErrorPayload
            → common/utils.parseError
```

**Key files:**
- `renderer/pages/conversation/platforms/acp/AcpSendBox.tsx`
- `renderer/pages/conversation/utils/conversationCreateError.ts`
- `common/utils/utils.ts` (`parseError` — shared error normalizer)

### 2 — Message send (AionRS path)

Parallel path for the AionRS agent platform:

```
AionrsSendBox.onSendHandler
  → executeCommand
    → conversationCreateError.getConversationRuntimeWorkspaceErrorMessage
      → [same chain as ACP path above]
        → common/utils.parseError
```

**Key file:** `renderer/pages/conversation/platforms/aionrs/AionrsSendBox.tsx`

### 3 — Conversation list — backend port resolution

How the conversation history row resolves agent avatars from the local backend:

```
ConversationRow
  → usePresetAssistantInfo
    → normalizeAvatar
      → resolveExtensionAssetUrl
        → resolveBackendAssetUrl
          → httpBridge.getBaseUrl
            → httpBridge.getBackendPort
```

**Key files:**
- `renderer/pages/conversation/GroupedHistory/ConversationRow.tsx`
- `renderer/hooks/agent/usePresetAssistantInfo.ts`
- `renderer/utils/platform.ts`
- `common/adapter/httpBridge.ts` — central `getBackendPort()` / `getBaseUrl()`

### 4 — Model selection

Model choice is persisted through the backend config service:

```
useGuidModelSelection
  → setDefaultModel / resetCurrentModel / setCurrentModel
    → configService.set
      → configService.fetchJson
        → configService.getBaseUrl          ← same httpBridge pattern
```

**Key files:**
- `renderer/pages/guid/hooks/useGuidModelSelection.ts`
- `common/config/configService.ts`

### 5 — Scheduled task creation

Creating a cron/scheduled task follows the same error-chain as message send:

```
CreateTaskDialog.handleSubmit
  → conversationCreateError.getConversationCreateErrorMessage
    → normalizeConversationCreateErrorCode
      → [workspace path error chain]
        → common/utils.parseError
```

**Key file:** `renderer/pages/cron/ScheduledTasksPage/CreateTaskDialog.tsx`

---

## Components

### Main Process (`packages/desktop/src/process/`)

- Node.js environment — no DOM APIs
- Owns SQLite via `better-sqlite3` (conversations, metrics, config)
- Manages auto-updater (`electron-updater`), native menus, OS notifications
- Spawns and supervises the `aioncore` subprocess; communicates port via IPC
- Routes remote channel traffic (Telegram, DingTalk, WeChat, Lark) → agent sessions

### Renderer Process (`packages/desktop/src/renderer/`)

- React 19 + Vite — no Node.js APIs
- All agent/model data fetched from aioncore via SWR (`DETECTED_AGENTS_SWR_KEY`)
- Two send-box platforms: `platforms/acp/` (ACP agents) and `platforms/aionrs/` (AionRS agents)
- `AcpModelSelector` renders `model_info.available_models` from the handshake — no hardcoded model list
- Common HTTP adapter: `common/adapter/httpBridge.ts` → `getBackendPort()` / `getBaseUrl()`

### Preload Bridge (`packages/desktop/src/preload/`)

- `contextBridge` isolation between main and renderer
- Exposes typed IPC channels as `window.bridge`
- All cross-process calls must go through this layer

### aioncore

- Bundled binary at `resources/bundled-aioncore/darwin-arm64/` (gitignored)
- Version pinned in `scripts/prepare-aioncore.js`; downloaded from GitHub releases at build time
- Starts on a dynamic port; port returned to main via subprocess stdout/IPC
- Exposes `/api/agents` returning detected agents with `handshake.available_models`

### ACP Plugin System

| Plugin | Version | Bundled at |
| ------ | ------- | ---------- |
| `claude-agent-acp` | 0.52.0 | `resources/local-managed-resources/acp/claude-agent-acp/0.39.0/darwin-arm64/` |
| `codex-acp` | 0.16.0 | `resources/local-managed-resources/acp/codex-acp/0.16.0/darwin-arm64/` |

`prepareManagedResources()` (in `prepare-aioncore.js`) copies these into the `.app` bundle and runs `npm install --production`. Cache cleared by `deploy.sh` on each deploy to force reinstall.

---

## Data Models

- **Conversations** — SQLite; metrics snapshots at 5-min cadence
- **Config** — persisted to aioncore via `configService.fetchJson` (HTTP PUT/GET)
- **Metrics DB** — `~/Library/Application Support/AionUi/metrics.db`
- **Runtime data** — ephemeral; held in SWR cache; re-fetched on app focus

---

## Integrations

| Integration | Package | Notes |
| ----------- | ------- | ----- |
| Anthropic Claude | `@anthropic-ai/sdk` | Direct API client |
| OpenAI-compatible | `openai` | Catches compatible providers |
| AWS Bedrock | `@aws-sdk/client-bedrock` | Optional provider |
| Google Gemini | `@google/genai` | Optional provider |
| Telegram | `grammy` | Remote channel |
| DingTalk | `dingtalk-stream` | Remote channel |
| WeChat Work | `@wecom/aibot-node-sdk` | Remote channel |
| Lark/Feishu | `@larksuiteoapi/node-sdk` | Remote channel |
| Auto-update | `electron-updater` | Update channel from `electron-builder.yml` |

---

## Deployment

- macOS arm64 only (personal build)
- **Fast:** `scripts/deploy.sh "msg"` → tsc → push → dir-build → `/Applications` → relaunch
- **Full:** `scripts/deploy.sh --full` → full gate (lint/format/test) → DMG + zip
- Signed with Apple Development identity (`JGNJA9J235`); notarization skipped (personal use)
- afterPack hook in `electron-builder.yml` runs `prepareManagedResources()` and `prepareAioncore()`

---

## Related Documents

- [[PROJECT]] — Risks, tasks, milestones
- [[DECISIONS]] — Architecture Decision Records
- [[DOMAIN]] — Business domain and glossary
- [[TOOLS]] — Tools and frameworks
