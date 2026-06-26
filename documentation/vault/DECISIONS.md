---
title: Agora — Decisions
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - decisions
  - adr
---

# Agora — Architecture Decision Records

## ADR-0001 — Peer identity cache

- **Date:** 2026-06-22
- **Status:** Accepted
- **Context:** Claude peer sessions lost identity on reconnect, causing confusing peer names in multi-session workflows.
- **Decision:** Cache peer identity (name, colour, alias) in a local store; re-apply on session start via `/rename` + `/color`.
- **Rationale:** Minimal overhead; makes peer UX consistent without server-side state.
- **Consequences:** Identity survives reconnect; stale cache possible if peer is manually renamed externally.

## ADR-0002 — Local-managed-resources instead of S3 for ACP plugins

- **Date:** 2026-06-25
- **Status:** Accepted
- **Context:** Original AionUi fetched ACP plugin tarballs from S3. Agora has no S3 credentials and the private fork removes the CDN dependency.
- **Decision:** Bundle ACP plugins (`claude-agent-acp`, `codex-acp`) directly in `resources/local-managed-resources/`; `npm install --production` at build time via `prepareManagedResources()`.
- **Rationale:** Zero external dependency at runtime; reproducible builds; no credential management.
- **Consequences:** Plugin upgrades require updating source tree and re-deploying. Node modules excluded from git (only manifests tracked).

## ADR-0003 — Model picker fully runtime-driven

- **Date:** 2026-06-25
- **Status:** Accepted
- **Context:** Original code had a mix of hardcoded model lists and runtime handshake data.
- **Decision:** `AcpModelSelector.tsx` renders only `model_info.available_models` from the aioncore handshake; no fallback list in renderer.
- **Rationale:** Single source of truth; upgrading the ACP plugin automatically updates the picker without UI changes.
- **Consequences:** If aioncore is unreachable, the picker shows a read-only pill (no model choices). Opus 4.8 requires upgrading `claude-agent-acp` to a version that includes it.

## ADR-0004 — No AI contributor signatures in commits

- **Date:** 2026-06-22
- **Status:** Accepted
- **Context:** Agora is a private personal project; AI-generated commit noise (Co-Authored-By lines) clutters git history.
- **Decision:** Never add `Co-Authored-By: Claude` or similar signatures to any commit.
- **Rationale:** Clean history; attribution unnecessary in a single-maintainer private repo.
- **Consequences:** None — enforced by CLAUDE.md convention.

---

## Related Documents

- [[ARCHITECTURE]] — System design
- [[PROJECT]] — Project context and decisions log
