# Local Agent (Ollama) Efficacy Ledger

Tracks every code task delegated to a local Ollama agent under the delegation mandate
(see [CLAUDE.md](../CLAUDE.md) → _Local Agent Delegation_). Purpose: measure where
local agents are trustworthy so the mandate can be tuned over time.

**Log one row per delegated task.** Keep it honest — record reworks and failures, not
just wins. A task Claude had to take over counts as a failed delegation, logged as such.

## Columns

- **Date** — ISO `YYYY-MM-DD`.
- **Task** — what was delegated (1 line).
- **Model** — Ollama model used (e.g. `qwen2.5-coder:32b`).
- **Rounds** — review→fix cycles before it passed (1 = clean first try).
- **Verdict** — `pass` (landed as written/after fixes), `taken-over` (Claude finished it),
  `abandoned` (reverted).
- **Notes** — what the agent got wrong, what it got right, why taken over.

## Ledger

| Date       | Task                                                                | Model               | Rounds | Verdict | Notes                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------- | ------------------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-25 | ISS-013: `useLoadedSkills` self-evicting scan cache + bounded retry | `qwen2.5-coder:32b` | 1      | pass    | Matched the bounded spec exactly — correct React effect cleanup, retry cap, and `clearTimeout` on unmount. Claude reviewed, refined one stale comment + added rationale comment, and wrote the guard test (`useLoadedSkills.dom.test.ts`). Subtle hook/closure logic landed clean first try. |

## Rolling summary

Update after each batch:

- **Delegations logged:** 1
- **Clean first-try rate:** 1/1 (100%)
- **Take-over rate:** 0/1 (0%)
- **Trusted task types:** bounded, fully-specified single-file React hook edits (cache/effect refactor) with an exact behavioural spec.
- **Not-yet-trusted:** _(none established yet)_
