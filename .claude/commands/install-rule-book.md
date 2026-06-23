---
description: Install a single rule-book skill (Clean Architecture, Refactoring, DDIA, etc.) from ~/.skills-manager/skills-library/agent-rules-books into a workspace. On-demand only — does NOT auto-deploy. Usage: /install-rule-book <book> [--variant mini|nano|full] [--workspace PATH | --global | --peer NAME]. No args → lists available books.
---

Install a rule-book skill for **$ARGUMENTS** using `~/.claude/scripts/install_rule_book.py`.

## Steps

### 1. Parse arguments

`$ARGUMENTS` may contain:

- A book slug (required unless `--list` or empty)
- `--variant mini|nano|full` (default: `mini` — recommended per upstream USAGE.md)
- `--workspace <path>` — target workspace (optional; default = CWD)
- `--global` — install to `~/.claude/skills/` (visible everywhere)
- `--peer <session_name>` — resolve workspace from `~/.claude/peers/peers.json`
- `--list` — list available books and variants, then stop

If `$ARGUMENTS` empty, run `--list`.

### 2. Pre-install conflict check (architectural rule-books)

If the requested book is one of the **architectural-paradigm** set:

- `clean-architecture`
- `domain-driven-design`
- `domain-driven-design-distilled`
- `implementing-domain-driven-design`
- `patterns-of-enterprise-application-architecture`
- `a-philosophy-of-software-design`

…then scan the target scope (`~/.claude/skills/` if `--global`, else the resolved workspace's `.claude/skills/`) for any already-installed book from the same set.

If a conflicting book is present, **stop and ask Pierre**:

> ⚠️ `<existing>` is already active in this scope. Stacking architectural rule-books (one paradigm per scope max) creates dogma soup — they will disagree on layering, dependency direction, and what counts as "domain". Choices: (a) replace `<existing>` with `<new>`, (b) install `<new>` to a different scope, or (c) cancel. Which?

Do not silently double-install paradigms. Pragma rule-books (`refactoring`, `refactoring-guru`, `clean-code`, `code-complete`, `the-pragmatic-programmer`, `release-it`, `working-effectively-with-legacy-code`, `designing-data-intensive-applications`) are non-conflicting — install freely.

### 3. Run installer

```bash
python3 ~/.claude/scripts/install_rule_book.py $ARGUMENTS
```

Capture stdout — it self-reports the destination path.

### 3. Variant guidance

Per upstream USAGE.md:

- `mini` (default) — recommended for most real task use; fits typical context budget
- `nano` — for very tight always-on contexts only
- `full` — for audit / one-off deep sessions / deriving smaller scoped rules

### 4. Post-install

Tell Pierre:

> ✓ Installed `<book>` (`<variant>`) at `<dest>`. Skill auto-triggers when description matches; or invoke explicitly with `/<book>-rules`.
>
> Source: `ciembor/agent-rules-books`. License: MIT.

If `--global`: warn that it now applies to **every** workspace.

## Examples

- `/install-rule-book` — list available books
- `/install-rule-book clean-architecture` — install mini in CWD
- `/install-rule-book refactoring --variant nano --peer calypso_developer` — install nano in Vault's workspace
- `/install-rule-book designing-data-intensive-applications --global` — install mini globally
- `/install-rule-book clean-code --variant full --workspace ~/Development/Projects/foo` — full audit variant in explicit workspace

## Common Issues

- **Book not found**: `--list` prints all available slugs.
- **Variant missing**: not all books ship all three variants — check `--list` output.
- **Skill doesn't trigger**: check the injected `description:` in the resulting SKILL.md frontmatter; tweak if too narrow.
- **Wanted everywhere?** Use `--global`. Otherwise this is workspace-scoped on purpose (per Pierre's no-auto-deploy rule for book-rules).

## Source

- Repo: https://github.com/ciembor/agent-rules-books
- Local clone: `~/.skills-manager/skills-library/agent-rules-books/`
- Installer: `~/.claude/scripts/install_rule_book.py`
