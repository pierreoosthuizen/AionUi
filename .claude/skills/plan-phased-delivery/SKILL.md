---
name: plan-phased-delivery
description: >
  Creates a phased implementation plan for any feature or task, with explicit approval
  gates between phases. Each phase includes architecture decisions, SOLID principles,
  design and analysis pattern guidance, impact analysis, and relevant skills to assist.
  Use when asked to "plan", "create a phased plan", "break this into phases",
  "implementation plan", or "plan this feature". Do NOT use for quick fixes or
  single-file tasks.
---

# plan-phased-delivery

Produces a phased delivery plan with approval gates. Each phase is self-contained,
verifiable, and safe to merge independently. No phase begins until Pierre approves
the previous one.

---

## When to invoke

- Pierre asks for a plan, implementation plan, or phased approach for a feature or task
- Feature is non-trivial (touches more than 2–3 files or spans multiple layers)
- Pierre says "plan this before we start" or similar

Do NOT invoke for:

- Hotfixes or single-file changes
- Tasks already broken into concrete steps in the conversation

---

## Step 1 — Gather context

Read relevant source files to understand:

- Existing architecture and layer structure
- Naming conventions and patterns already in use
- Entry points affected by the planned change
- Test structure (where tests live, what framework is used)

Use a Haiku sub-agent when reading more than 5 files:

```
Agent({
  model: "haiku",
  prompt: "Read these files and summarise: architecture layers, naming patterns,
           test framework used, entry points relevant to <feature>: [file list]"
})
```

---

## Step 2 — Find complementary skills

Scan only skills installed in the current workspace (these are the skills
actually active for this project):

```bash
ls "$(pwd)/.claude/skills/" 2>/dev/null
```

For each skill listed, read its `description` frontmatter from
`$(pwd)/.claude/skills/<name>/SKILL.md` to understand what it does.
Match skills to the planned work per phase.

For each phase, identify skills that can assist (e.g. `apply-logging` for a
service layer phase, `create-test-matrix` for a testing phase, `document-object`
for a public API phase). Include these under each phase's **Skills** section.

Flag skills that apply across the full plan — e.g. a logging skill spanning
all phases, or a vault skill for documentation.

Do NOT scan global `~/.claude/skills/` or other locations — only workspace-local
skills are relevant.

---

## Step 3 — Decompose into phases

Phases must follow natural dependency order — no phase should depend on work
from a later phase. Common decompositions:

| Work type          | Typical phase order                                               |
| ------------------ | ----------------------------------------------------------------- |
| New domain feature | Domain model → Service/Repository → Tests → UI                    |
| Refactor           | Interfaces/contracts → Implementation → Migrate callers → Cleanup |
| API/integration    | Schema/contract → Server-side → Client-side → Tests               |
| Infrastructure     | Config/infrastructure → Core logic → Integration tests            |

Rules:

- Each phase must be independently deployable or at minimum independently verifiable
- 2–6 phases; split if scope is large, combine if phases have no independent value
- Prefer fewer phases with clear scope over many thin ones

---

## Step 4 — Build the plan

For each phase, produce the following sections:

```markdown
## Phase N — <Name>

**Scope:** [Exactly what is in scope. State explicitly what is OUT of scope.]

### Architecture

[How this phase fits the existing architecture. New layers, boundaries, or
abstractions introduced. Flag if the phase changes a public contract or interface.]

### SOLID Analysis

Check each SOLID principle against the planned changes. Record only the principles
that are materially exercised or at risk. Read the SOLID-principles reference if
available in the workspace at `~/.claude/commands/references/SOLID-principles.md`.

| Principle | How applied / risk |
| --------- | ------------------ |
| SRP       | ...                |
| OCP       | ...                |
| LSP       | ...                |
| ISP       | ...                |
| DIP       | ...                |

State "No SOLID concerns" if the phase is purely additive and low-risk.

### Design Patterns

Apply /consider-design-pattern logic to the planned changes. For each candidate:

- Pattern name, where it applies, what it improves, confidence (High / Medium / Low)

State "No pattern warranted" if none apply — do not force patterns.

### Analysis Patterns

Apply /consider-analysis-pattern logic if this phase touches domain modelling.
Skip and state "Not applicable" if the phase is infrastructure, UI, or utility code.

### Impact Analysis

| Area                                | Detail               | Risk                |
| ----------------------------------- | -------------------- | ------------------- |
| Affected components                 | [list]               | High / Medium / Low |
| Breaking changes                    | [list or "None"]     |                     |
| Data migrations                     | [required or "None"] |                     |
| Phases blocked until this completes | [list or "None"]     |                     |
| Rollback complexity                 | [describe]           |                     |

### Skills

[Skills from Step 2 that assist this specific phase, with one-line note on how.]
State "None" if no installed skill maps to this phase.

### Files

| Action | Path           | Purpose        |
| ------ | -------------- | -------------- |
| Create | `path/to/file` | [why]          |
| Modify | `path/to/file` | [what changes] |

### Verification

[Concrete, runnable steps to confirm the phase is complete and correct]

**Approval gate: Pierre must approve before Phase N+1 begins.**
```

---

## Step 5 — Present plan

Produce the full plan document:

```markdown
# Plan: <Feature / Task Name>

## Context

[Why this change is needed — business or technical motivation]

## Approach

[1–2 sentence summary of the overall strategy]

## Complementary Skills

[Skills identified in Step 2 that apply across the full plan]

## Phase Overview

| Phase | Name | Key deliverable |
| ----- | ---- | --------------- |
| 1     | ...  | ...             |

---

[Phase 1 … Phase N sections]
```

Save to `.claude/plans/<feature-name>.md` in the workspace. Present to Pierre and
wait for explicit approval of Phase 1 before any implementation begins.

---

## Step 6 — Gate loop

After each phase is implemented and verified:

1. Confirm all verification steps pass
2. Ask Pierre: _"Phase N complete and verified. Approve to continue to Phase N+1?"_
3. Do not write Phase N+1 code until Pierre explicitly approves

---

## Rules

- Never collapse phases to speed up delivery. Each phase boundary is a real checkpoint.
- Never begin implementation before the full plan is approved.
- If a phase has no content for a given section, state it explicitly — no filler.
- SOLID and pattern analysis must be honest. If nothing applies, say so.
- Impact analysis is mandatory for every phase. Never omit it.
- Complementary skills must be real installed skills — never invent skill names.

---

## Examples

- "Plan the notification service feature" → domain model → service layer → tests → integration phases
- "Create a phased plan for the auth refactor" → interfaces/contracts → swap implementations → migrate callers → cleanup
- "Break this API integration into phases" → schema/contract → server-side → client-side → integration tests

## Common Issues

- **Too many phases**: combine phases with no independent verification step
- **Phase 1 too large**: if it spans more than ~10 files, split further
- **Pattern forced**: only flag High or Medium confidence patterns
- **No complementary skills found**: check `$(pwd)/.claude/skills/` exists and has entries. If workspace hasn't had a profile applied, run `install-profile` first. Never invent skill names.
