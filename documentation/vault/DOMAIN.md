---
title: Agora — Domain
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - domain
---

# Agora — Domain

## Business Context

Agora is a personal productivity tool that gives a single power user (Pierre) a unified desktop chat interface for multiple AI agents. It removes the friction of running AI agents in raw terminal sessions by providing conversation history, model switching, skill management, and peer collaboration across Claude Code sessions.

## User Personas

**Pierre (sole user)**
- Software engineer / consultant
- Runs multiple AI agent sessions concurrently (Claude Code, Codex, Goose)
- Needs quick model switching, conversation history, metrics, and skill invocation
- Works on macOS arm64 exclusively

## Domain Model

### Agent
An AI assistant backend (e.g. Claude Code, Codex) that implements the ACP handshake. Detected at runtime by aioncore; exposes `available_models`, `handshake`, and session state.

### Conversation
A threaded exchange between the user and an agent, persisted in SQLite. Belongs to a single agent session.

### Skill
A markdown-driven instruction set loaded into the Claude Code session. Managed by the skills sidebar; grouped and filterable.

### Peer
Another Claude Code instance on the same machine, identified by colour/alias. Can send/receive messages via the claude-peers MCP.

### Session
A running aioncore subprocess instance on a dynamic port. Port communicated to the renderer; stale port detection via ISS-016 fix.

### Model
An LLM available to an agent, advertised in the ACP handshake `available_models` array. Display label vs model ID aliased by the ACP plugin.

## Glossary

| Term | Definition |
| ---- | ---------- |
| ACP | Agent Client Protocol — the handshake/messaging protocol between aioncore and AI agent plugins |
| aioncore | The bundled local backend subprocess that coordinates agent sessions |
| AionUi | The upstream open-source project Agora was forked from |
| ISS-NNN | Internal issue tracking prefix (e.g. ISS-014 = managed resources issue) |
| REQ-NNN | Internal feature requirement prefix |
| managed-resources | ACP plugin installations bundled into the `.app` at build time |
| SWR | Stale-while-revalidate — the React data-fetching strategy used for agent/model data |
| peer | Another Claude Code instance discoverable via claude-peers MCP |

---

## Related Documents

- [[ARCHITECTURE]] — System design
- [[PROJECT]] — Project context
- [[UI-DESIGN]] — UX and user flows
