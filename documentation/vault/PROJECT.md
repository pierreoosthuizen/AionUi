---
title: Agora — Project
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - project-management
---

# Agora — Project

## Mission

A private, single-maintainer Electron desktop app that wraps command-line AI agents (Claude, Codex, Goose, etc.) in a modern chat interface, running a bundled `aioncore` subprocess as the local AI coordination backend.

## Milestones

| Milestone | Target Date | Status |
| --------- | ----------- | ------ |
| v1.00 — Initial private fork, rebrand, DMG | 2026-06-22 | Done |
| v1.10.0 — ACP model picker, REQ-026/027, ISS-014/016/017 | 2026-06-26 | Done |

## Risks

| ID | Risk | Impact | Likelihood | Mitigation |
| -- | ---- | ------ | ---------- | ---------- |
| R-001 | aioncore upstream diverges; bundled binary stale | High | Medium | Pin version in `prepare-aioncore.js`; monitor releases |
| R-002 | claude-agent-acp model list lags Anthropic releases | Medium | High | Upgrade `local-managed-resources/acp/claude-agent-acp` when new models ship |
| R-003 | Bun lockfile diverges from node_modules in CI | Low | Low | `bun install --frozen-lockfile` in build |

## Issues

| ID | Description | Priority | Status |
| -- | ----------- | -------- | ------ |
| ISS-014 | Bypass S3 — install managed ACP tools locally | High | Done |
| ISS-016 | Stale aioncore port survives faulty pkill in deploy.sh | High | Done |
| ISS-017 | Stream test + autoscroll refs broken | Medium | Done |

## Tasks

| ID | Task | Due | Status |
| -- | ---- | --- | ------ |
| T-001 | Upgrade claude-agent-acp to version that includes claude-opus-4-8 | — | Open |

## Stakeholders

| Name | Role | Contact |
| ---- | ---- | ------- |
| Pierre Oosthuizen | Sole maintainer / product owner | oosthuizen.pierre@gmail.com |

## Decisions Log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-06-22 | Fork AionUi as private Agora repo | Full control; remove public OSS obligations |
| 2026-06-25 | Use local-managed-resources instead of S3 for ACP plugins | No S3 credentials; self-contained build |
| 2026-06-26 | Remove upstream docs, pet-states, e2e suite, CI/CD, Playwright | Private fork; dead weight |

---

## Related Documents

- [[ARCHITECTURE]] — System design, components, data models
- [[DECISIONS]] — Architecture Decision Records
- [[DOMAIN]] — Business domain and glossary
- [[TOOLS]] — Tools and automation
- [[UI-DESIGN]] — Design system and UX flows
- [[LOGGING]] — Logging strategy
- [[LEGAL]] — Copyright and licences
