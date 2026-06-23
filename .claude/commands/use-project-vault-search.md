---
description: >
  Search the project documentation vault via ChromaDB instead of scanning
  files. Trigger proactively whenever you would otherwise use Glob, Grep, or
  Read to explore a project's docs/ or documentation/ folder, or when
  answering questions about project architecture, design decisions, domain
  models, or logging/error conventions for chemcheck, delphi, or any other
  registered project vault.
allowed-tools: Bash, Read
---

# use-project-vault-search

Use the local ChromaDB vector index when you need information from a project's
documentation vault. **Do not scan documentation directories with Glob/Grep
unless vault search returns no useful results.**

---

## Why this matters

Each project vault (docs/) is indexed daily into an isolated ChromaDB
collection. Semantic search returns the most relevant chunks across all
documentation files in a single query — far faster than scanning a directory
tree and reading individual files.

---

## Registered project collections

| Slug             | Project           | Source path                                                                   |
| ---------------- | ----------------- | ----------------------------------------------------------------------------- |
| `chemcheck-docs` | ChemCheck Android | `/Users/pierreo/Development/Projects/chemcheck/chemcheck_android/docs/vault/` |
| `delphi-docs`    | Delphi            | `/Users/pierreo/Development/Projects/delphi/Delpi/documentation/vault/`       |

New projects are added via the `/add-project-vault` command in the
`ImproveClaude` workspace.

---

## How to search

```bash
~/.claude/skills/vault-search/scripts/search_vault.py \
  --query "your natural language question here" \
  --collections <slug> \
  --top-n 5
```

**Examples:**

```bash
# Architecture overview
~/.claude/skills/vault-search/scripts/search_vault.py \
  --query "overall system architecture and component responsibilities" \
  --collections chemcheck-docs --top-n 5

# Design decision
~/.claude/skills/vault-search/scripts/search_vault.py \
  --query "authentication approach and token storage decision" \
  --collections chemcheck-docs --top-n 3

# Cross-project search (when project context is ambiguous)
~/.claude/skills/vault-search/scripts/search_vault.py \
  --query "error handling conventions" \
  --collections chemcheck-docs delphi-docs --top-n 5
```

Always use the venv interpreter — the shebang resolves it automatically when
called directly. Never use bare `python3`.

---

## When to trigger

Apply this skill **instead of file scanning** when you would normally:

| Situation                    | Old approach            | New approach                      |
| ---------------------------- | ----------------------- | --------------------------------- |
| Understand project structure | `Glob **/*.md` in docs/ | Search `*-docs` collection        |
| Check a design decision      | Read `DECISIONS.md`     | Search with decision keywords     |
| Understand domain model      | Read `DOMAIN.md`        | Search with domain terms          |
| Find logging conventions     | Read `LOGGING.md`       | Search "logging conventions"      |
| Check API contract           | Glob for API docs       | Search with endpoint/method terms |
| Answer "how does X work"     | Read source + docs      | Search docs first, then source    |

---

## Interpreting results

Each chunk returned includes:

```
[VAULT: chemcheck-docs] [FILE: ARCHITECTURE.md] [Score: 0.87]
---
...chunk content...
---
```

- **Score ≥ 0.7** — high relevance, use as primary context
- **Score 0.4–0.7** — moderate relevance, use with caution
- **Score < 0.4** — low relevance; consider rephrasing the query or falling back to file read

Always cite the source file when referencing retrieved content.

---

## Fallback to file reading

Fall back to direct file reading only when:

- Vault search returns no chunks above 0.3 threshold
- The query requires reading structured data (tables, code blocks) that may be
  chunked poorly (e.g., reading a YAML config verbatim)
- Pierre explicitly asks you to read a specific file

When falling back, read the specific file rather than scanning the whole
directory.

---

## Keeping the index current

The vault index is updated daily by launchd:

| Collection       | Schedule    | Plist                             |
| ---------------- | ----------- | --------------------------------- |
| `chemcheck-docs` | 06:15 daily | `com.pierre.chemcheck-docs-index` |
| `delphi-docs`    | 06:30 daily | `com.pierre.delphi-docs-index`    |

If results seem stale (Pierre says docs were recently updated), trigger a
manual re-index:

```bash
~/.claude/vault-search/venv/bin/python3 \
  ~/.claude/skills/vault-search/scripts/index_vaults.py \
  --collections chemcheck-docs
```
