# release-evidence

Generate a structured ADLC release evidence record before closing or deploying any work item. Covers all six evidence categories required by the ADLC lifecycle (V1.2).

**Human in the loop:** Pierre must review and sign off this evidence record before the item is marked complete or promoted.

## When to Use

Run before closing, merging, or deploying any feature, bugfix, or configuration change. Covers code projects, skill changes, infrastructure changes, and automation work.

## How to Gather Evidence

Work through each section. For each category, inspect what actually changed — do not guess or leave blanks. If a category is not applicable, state "N/A — <reason>".

### 1. Code Changes

- Run `git diff main` (or against the base branch) and summarise: files, modules, functions changed.
- Note any database schema, migration, or environment variable changes.

### 2. Skill / Prompt Changes

- List any SKILL.md files created or updated.
- List any prompt templates, system instructions, or slash commands changed.
- If a skill description was edited, confirm the description eval passed (Forge changelog).

### 3. RAG / Vault / Documentation Changes

- List any SecondBrain vault notes created, updated, or deleted.
- List any reference docs, README files, or CLAUDE.md files updated.
- Note if vault search collections need re-indexing.

### 4. Tool / MCP Changes

- List any MCP server configurations added, removed, or updated.
- List any settings.json or settings.local.json changes (hooks, permissions, env vars).
- Note any new tool integrations or removed capabilities.

### 5. Model / Profile Configuration Changes

- Note any profile changes (skills added/removed, plugins enabled/disabled, MCP servers).
- Note any model routing or prompt caching configuration changes.

### 6. Orchestration Changes

- Note any peer configuration changes (peers.json, peer instructions).
- Note any hook, cron, or automation changes.

## Output Format

```
## Release Evidence Record

**Item:** <title or issue/task ref>
**Date:** <today>
**Prepared by:** <peer alias>

---

### 1. Code Changes
<summary or N/A>

### 2. Skill / Prompt Changes
<list or N/A>

### 3. RAG / Vault / Documentation Changes
<list or N/A>

### 4. Tool / MCP Changes
<list or N/A>

### 5. Model / Profile Configuration Changes
<list or N/A>

### 6. Orchestration Changes
<list or N/A>

---

**Release Gate: READY / NOT READY**
<one sentence rationale>

> ⚠ Pierre must review and approve before this item is closed or deployed.
```

## Traceability Log

After generating the evidence record, append a one-line entry to `~/.claude/reports/traceability.md`:

```
| <YYYY-MM-DD> | <item ref> | release-evidence | <one-line summary of what changed> |
```

Create the file with a header row if it does not exist:

```
| Date | Item | Stage | Summary |
|------|------|-------|---------|
```
