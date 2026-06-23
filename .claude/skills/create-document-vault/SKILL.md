---
name: create-document-vault
description: >
  Initialise an Obsidian project vault if one does not exist, and document
  project information into the vault following the established conventions.
  Use when starting a new project, when Pierre asks to "set up the vault",
  "create a document vault", "document this in the project vault",
  "add this to the project docs", or when a vault document is missing and
  needs to be created. Keeps the vault formatted as a valid Obsidian vault
  with YAML frontmatter, WikiLinks, and a consistent document set.
user-invocable: true
---

# Create Document Vault

Initialise and maintain a project Obsidian vault following the established
conventions. The vault lives inside the project and serves as the canonical
design and architecture documentation hub.

---

## Two Modes

| Mode     | When to use                                                                       |
| -------- | --------------------------------------------------------------------------------- |
| **init** | No `documentation/vault/` directory exists yet, or Pierre says "set up the vault" |
| **doc**  | Vault exists — add or update a specific document with project information         |

Determine the mode automatically from context. If ambiguous, ask Pierre one line:

> "Should I initialise a new vault, or add a document to an existing one?"

---

## Vault Location

### Detection order

1. Check `CLAUDE.md` in the project root — it may specify a vault path.
2. Check for `documentation/vault/` relative to the project root (the default).
3. Check the conversation — Pierre may have mentioned a path.
4. If still unknown, **ask Pierre**:
   > "Where should the project vault live? (default: `documentation/vault/`)"

Never guess or create a vault in the wrong location. Confirm with Pierre if unsure.

---

## Init Mode — Vault Scaffold

Create the following structure. All paths are relative to `documentation/`
(the parent of the vault root).

```
documentation/
├── diagrams/             ← draw.io, PNG, SVG diagrams exported from the vault
├── vault/                ← Obsidian vault (the document hub)
│   ├── .obsidian/
│   │   ├── app.json
│   │   └── workspace.json
│   ├── attachments/      ← images and binary assets referenced in docs
│   ├── ARCHITECTURE.md   ← system design, components, data models, integrations
│   ├── DECISIONS.md      ← Architecture Decision Records (ADRs)
│   ├── DOMAIN.md         ← business/clinical domain, user personas, glossary
│   ├── PROJECT.md        ← risks, issues, tasks, milestones, stakeholders, decisions log
│   ├── UI-DESIGN.md      ← design system, screen inventory, UX flows, component specs, brand
│   ├── LOGGING.md        ← logging strategy, log levels, categories, audit rules
│   ├── TOOLS.md          ← tools, frameworks, packages, Claude skills/plugins used
│   └── LEGAL.md          ← copyright, IP ownership, licences, source file header
├── source_documents/     ← raw inputs — specs, BRDs, PDFs, meeting notes
└── user_guides/          ← end-user facing guides, release notes, how-tos
```

### Step-by-step

1. Confirm the vault path with Pierre (see Detection order above).
2. Create the directory tree using `mkdir -p`:
   - `documentation/diagrams/`
   - `documentation/vault/.obsidian/`
   - `documentation/vault/attachments/`
   - `documentation/source_documents/`
   - `documentation/user_guides/`
3. Create `.obsidian/app.json` (minimal valid Obsidian config):
   ```json
   {}
   ```
4. Create `.obsidian/workspace.json` (empty workspace):
   ```json
   {
     "main": { "id": "main", "type": "split", "children": [] },
     "left": { "id": "left", "type": "split", "children": [] },
     "right": { "id": "right", "type": "split", "children": [] }
   }
   ```
5. Create each vault document using the **Document Templates** below.
   - Only create documents that do not already exist.
   - Pre-populate the frontmatter with project details derived from `CLAUDE.md`,
     `pubspec.yaml`, `package.json`, or any other project config files you can read.
6. Update `CLAUDE.md` in the project root to reference the vault path.
7. Confirm to Pierre with the full list of created files.

---

## Doc Mode — Add or Update a Vault Document

When Pierre says "document X in the vault" or you need to record new information:

1. Read the vault path from `CLAUDE.md` or use the default.
2. Determine which vault document is the correct target (see Routing table).
3. Read the existing document if it exists.
4. Add or update the relevant section(s) with the new information.
5. Update the `updated` field in the YAML frontmatter to today's date.
6. If a new vault document must be created, use the Document Templates below.
7. Confirm to Pierre with the document path and a one-line summary.

### Routing table

| Information type                                                        | Target document   |
| ----------------------------------------------------------------------- | ----------------- |
| Mission, product vision, milestones, risks, issues, tasks, stakeholders | `PROJECT.md`      |
| System architecture, components, data models, APIs, offline strategy    | `ARCHITECTURE.md` |
| Architectural Decision Records (ADRs), design trade-offs                | `DECISIONS.md`    |
| Screen designs, UX flows, design system, brand, accessibility           | `UI-DESIGN.md`    |
| Domain model, user personas, clinical/business scope, glossary          | `DOMAIN.md`       |
| Log levels, categories, audit rules, Logcat filters                     | `LOGGING.md`      |
| Tools, frameworks, packages, Claude skills/plugins/automations          | `TOOLS.md`        |
| Copyright, IP, source file headers, third-party licences                | `LEGAL.md`        |

If the information spans multiple documents, update each one.
If no document fits, create a new one and add it to the Related Documents
section of `PROJECT.md` and to the vault index table in `TOOLS.md`.

---

## Document Templates

Every vault document uses this frontmatter and cross-linking convention.

### Frontmatter rules

- **title** — `"<Project Name> — <Document Title>"` (e.g. `"MalariaRx — Architecture"`)
- **version** — Start at `1.0`; increment by `0.1` for minor updates, `1.0` for major revisions
- **created** — Date the file was first created (`YYYY-MM-DD`)
- **updated** — Today's date whenever the file is touched (`YYYY-MM-DD`)
- **tags** — Array format (YAML list, not inline); include the project slug and document topic tags

### WikiLink rules

- Use `[[DOCNAME]]` (all-caps, no extension) for cross-references to other vault documents
- Use descriptive link text when the document name alone is ambiguous: `[[DOMAIN|Clinical Domain]]`
- Every document must have a **Related Documents** section at the bottom

---

### ARCHITECTURE.md

```markdown
---
title: <Project Name> — Architecture
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, architecture]
---

# <Project Name> — Architecture

## Overview

<!-- High-level system description -->

## Components

<!-- List and describe major components/services -->

## Data Models

<!-- Key entities, relationships, storage strategy -->

## Integrations

<!-- External systems, APIs, MCP servers -->

## Deployment

<!-- Environments, infrastructure, CI/CD -->

---

## Related Documents

- [[PROJECT]] — Risks, tasks, milestones
- [[DECISIONS]] — Architecture Decision Records
- [[DOMAIN]] — Business domain and glossary
- [[TOOLS]] — Tools and frameworks
```

### DECISIONS.md

```markdown
---
title: <Project Name> — Decisions
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, decisions, adr]
---

# <Project Name> — Architecture Decision Records

## ADR Template

### ADR-NNN — <Title>

- **Date:** YYYY-MM-DD
- **Status:** Proposed / Accepted / Deprecated / Superseded by ADR-NNN
- **Context:** <!-- What is the situation forcing this decision? -->
- **Decision:** <!-- What was decided? -->
- **Rationale:** <!-- Why this option over alternatives? -->
- **Consequences:** <!-- What does this change? What trade-offs are accepted? -->

---

## Related Documents

- [[ARCHITECTURE]] — System design
- [[PROJECT]] — Project context and decisions log
```

### DOMAIN.md

```markdown
---
title: <Project Name> — Domain
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, domain]
---

# <Project Name> — Domain

## Business Context

<!-- What problem this project solves, who it is for -->

## User Personas

<!-- Who uses this system and what they need -->

## Domain Model

<!-- Key concepts, entities, and relationships in the business domain -->

## Glossary

| Term | Definition |
| ---- | ---------- |
|      |            |

---

## Related Documents

- [[ARCHITECTURE]] — System design
- [[PROJECT]] — Project context
- [[UI-DESIGN]] — UX and user flows
```

### PROJECT.md

```markdown
---
title: <Project Name> — Project
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, project-management]
---

# <Project Name> — Project

## Mission

<!-- One sentence: what this project achieves and why it matters -->

## Milestones

| Milestone | Target Date | Status |
| --------- | ----------- | ------ |
|           |             |        |

## Risks

| ID  | Risk | Impact | Likelihood | Mitigation |
| --- | ---- | ------ | ---------- | ---------- |
|     |      |        |            |            |

## Issues

| ID  | Description | Priority | Owner | Status |
| --- | ----------- | -------- | ----- | ------ |
|     |             |          |       |        |

## Tasks

| ID  | Task | Owner | Due | Status |
| --- | ---- | ----- | --- | ------ |
|     |      |       |     |        |

## Stakeholders

| Name | Role | Contact |
| ---- | ---- | ------- |
|      |      |         |

## Decisions Log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
|      |          |           |

---

## Related Documents

- [[ARCHITECTURE]] — System design
- [[DECISIONS]] — Architecture Decision Records
- [[DOMAIN]] — Business domain
- [[TOOLS]] — Tools and automation
```

### UI-DESIGN.md

```markdown
---
title: <Project Name> — UI Design
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, ui-design]
---

# <Project Name> — UI Design

## Brand

<!-- Visual identity: colours, typography, logo usage rules -->

## Design System

<!-- Spacing scale, grid, elevation, shadows -->

## Component Library

<!-- Key components, variants, usage rules -->

## Screen Inventory

| Screen | Purpose | Notes |
| ------ | ------- | ----- |
|        |         |       |

## User Flows

<!-- Describe key user journeys; embed diagrams from `../../diagrams/` -->

## Accessibility

<!-- WCAG level, contrast ratios, keyboard nav, screen reader requirements -->

---

## Related Documents

- [[DOMAIN]] — User personas and context
- [[ARCHITECTURE]] — Technical constraints on UI
```

### LOGGING.md

```markdown
---
title: <Project Name> — Logging
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, logging]
---

# <Project Name> — Logging Strategy

## Log Levels

| Level | When to use                                                     |
| ----- | --------------------------------------------------------------- |
| ERROR | Unrecoverable failures requiring immediate attention            |
| WARN  | Recoverable issues, unexpected but handled states               |
| INFO  | Normal operational events (startup, shutdown, key user actions) |
| DEBUG | Detailed diagnostic information (dev/QA only)                   |
| TRACE | Step-by-step execution traces (dev only)                        |

## Log Categories

<!-- Domain-specific log categories or tags used to group/filter logs -->

## Audit Logging

<!-- Events that must always be logged for compliance or security -->

## What NOT to Log

- Passwords, tokens, or credentials
- Full PII (mask or truncate where required)
- Sensitive financial or health data in plain text

---

## Related Documents

- [[TOOLS]] — Logging frameworks and tools
- [[LEGAL]] — Data retention and compliance requirements
```

### TOOLS.md

```markdown
---
title: <Project Name> — Tools
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, tools]
---

# <Project Name> — Tools & Automation

## Frameworks & Libraries

| Tool | Version | Purpose |
| ---- | ------- | ------- |
|      |         |         |

## Claude Skills Used

| Skill | Purpose |
| ----- | ------- |
|       |         |

## Claude Plugins / MCPs

| Plugin / MCP | Purpose |
| ------------ | ------- |
|              |         |

## Scripts & Automation

| Script | Location | Purpose |
| ------ | -------- | ------- |
|        |          |         |

## Vault Index

| Document         | Purpose                                 |
| ---------------- | --------------------------------------- |
| [[ARCHITECTURE]] | System design, components, data models  |
| [[DECISIONS]]    | Architecture Decision Records           |
| [[DOMAIN]]       | Business domain, personas, glossary     |
| [[PROJECT]]      | Risks, issues, tasks, milestones        |
| [[UI-DESIGN]]    | Design system, screens, UX flows, brand |
| [[LOGGING]]      | Logging strategy and rules              |
| [[TOOLS]]        | This document                           |
| [[LEGAL]]        | Copyright, licences                     |

---

## Related Documents

- [[PROJECT]] — Project context
- [[ARCHITECTURE]] — Technical environment
```

### LEGAL.md

```markdown
---
title: <Project Name> — Legal
version: 1.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [<project-slug>, legal]
---

# <Project Name> — Legal

## Copyright

<!-- Owner, year, rights reserved statement -->

## IP Ownership

<!-- Who owns the intellectual property produced by this project -->

## Source File Header

<!-- Standard header to prepend to all source files, if required -->
```

// Copyright (C) YYYY <Owner>. All rights reserved.

```

## Licences

| Dependency | Licence | Obligations |
|------------|---------|-------------|
|            |         |             |

## Compliance Notes

<!-- Regulatory requirements (POPIA, GDPR, HIPAA, etc.) that apply -->

---

## Related Documents

- [[LOGGING]] — Data retention and PII handling
- [[PROJECT]] — Stakeholders and decisions
```

---

## Obsidian Conventions

- Heading hierarchy: `#` for document title, `##` for top-level sections, `###` for subsections
- Tables: use Markdown pipe tables — Obsidian renders them natively
- WikiLinks: `[[DOCNAME]]` (all-caps, no extension) for cross-references to other vault documents
- Images: place in `attachments/` subfolder; reference with `![[filename.png]]`
- Diagrams: export to `../diagrams/` and reference from vault docs
- Code blocks: use fenced triple-backtick with language hint
- Callouts: use Obsidian callout syntax `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`
- Never use HTML tags — Obsidian's renderer handles native Markdown only

---

## Cross-Document Consistency

After creating or updating any vault document:

1. Check that `PROJECT.md` → **Related Documents** links to it.
2. Check that `TOOLS.md` → **Vault Index** table lists it.
3. If a new document was created, add it to both.

---

## Quality Checklist

Before confirming to Pierre:

- [ ] Vault path confirmed (from CLAUDE.md, convention, or Pierre's input)
- [ ] All outer folders created (`diagrams/`, `vault/`, `source_documents/`, `user_guides/`)
- [ ] `vault/.obsidian/app.json` and `workspace.json` created
- [ ] `vault/attachments/` created
- [ ] All vault documents created with correct frontmatter
- [ ] `created` and `updated` dates are today
- [ ] `tags` use array format (not inline)
- [ ] WikiLinks use `[[DOCNAME]]` format (no `.md` extension)
- [ ] `TOOLS.md` vault index table lists all documents
- [ ] `PROJECT.md` Related Documents links to all vault docs
- [ ] `CLAUDE.md` updated with vault path (init mode only)
- [ ] No HTML tags in document body
- [ ] `.obsidian/app.json` and `.obsidian/workspace.json` exist (init mode only)
