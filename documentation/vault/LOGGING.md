---
title: Agora — Logging
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - logging
---

# Agora — Logging Strategy

## Log Levels

| Level | When to use |
| ----- | ----------- |
| ERROR | Unrecoverable failures requiring immediate attention |
| WARN  | Recoverable issues, unexpected but handled states |
| INFO  | Normal operational events (startup, shutdown, key user actions) |
| DEBUG | Detailed diagnostic information (dev/QA only) |
| TRACE | Step-by-step execution traces (dev only) |

## Logging Framework

- **Main process:** `electron-log` — writes to `~/Library/Logs/Agora/`
- **Renderer:** `console.*` bridged through `electron-log` in dev; suppressed in prod

## Log Categories

| Category | Description |
| -------- | ----------- |
| `[aioncore]` | Subprocess lifecycle — spawn, port assignment, exit |
| `[acp]` | ACP handshake, model discovery, session events |
| `[ipc]` | IPC bridge calls between main and renderer |
| `[deploy]` | Build, install, and relaunch events (deploy.sh stdout) |
| `[metrics]` | SQLite write cadence, snapshot counts |

## Audit Logging

No formal compliance requirements (personal tool). Key events to always log:
- aioncore subprocess start/stop + port
- ACP plugin install/version on each build
- Conversation creation and deletion

## What NOT to Log

- API keys or tokens
- Full message content in production (conversation privacy)
- Any credentials passed via IPC

---

## Related Documents

- [[TOOLS]] — Logging frameworks and tools
- [[LEGAL]] — Data retention and compliance
