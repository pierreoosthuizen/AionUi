# start-development

Delegate work to local Ollama models first; Claude reviews and applies. Covers code, prose,
text extraction, analysis, and structured data tasks.

## Model roles

| Model               | Best for                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `qwen2.5-coder:32b` | Code generation, CRUD scaffolding, unit tests, docstrings, JSON/schema extraction, migrations |
| `llama3.3:70b`      | Prose drafting, PR descriptions, changelogs, README, internal docs, text parsing              |
| `deepseek-r1:32b`   | Code review, logic analysis, correctness checks, reasoning over text                          |

## Pipeline

1. **Classify** — is the task primarily _code_, _prose_, or _analysis_? Pick the lead model from the table above.
2. **Generate** — call `mcp__ollama__ollama_generate` with the lead model. Give a concrete, self-contained prompt. Request output only, no explanation.
3. **Reason** _(non-trivial tasks only)_ — call `mcp__ollama__ollama_generate` with `deepseek-r1:32b`. Pass original spec + generated output. Ask: "Review for correctness and edge cases. Return corrected output and a short change list."
4. **Review** — you (Claude) read the reasoned output. Apply with Edit/Write tools. Flag anything the local models missed.

## Skip step 3 when

- Output is < 20 lines with no branching logic or ambiguity
- Task is pure reformatting or boilerplate with no correctness risk

## Routing examples

| Task                                    | Lead model          |
| --------------------------------------- | ------------------- |
| New service/controller/repo layer       | `qwen2.5-coder:32b` |
| Unit tests with mocking                 | `qwen2.5-coder:32b` |
| Javadoc / docstrings on existing code   | `qwen2.5-coder:32b` |
| SQL/Flyway migration from schema diff   | `qwen2.5-coder:32b` |
| TypeScript interfaces from JSON/XSD     | `qwen2.5-coder:32b` |
| PR description from git diff            | `llama3.3:70b`      |
| Changelog from commit list              | `llama3.3:70b`      |
| Draft internal doc / README section     | `llama3.3:70b`      |
| Extract structured fields from freetext | `llama3.3:70b`      |
| Parse and classify log/text data        | `llama3.3:70b`      |
| Code correctness review                 | `deepseek-r1:32b`   |
| Analyse business logic for edge cases   | `deepseek-r1:32b`   |

## Fallbacks

- `qwen2.5-coder:32b` unavailable → `qwen2.5-coder:14b-instruct-q5_K_M`
- `llama3.3:70b` unavailable → `qwen2.5:14b-instruct-q5_K_M`
- `deepseek-r1:32b` unavailable → skip step 3, go to Claude review

## Hard limits — always keep with Claude

Security review, architecture decisions, multi-file refactors with side effects,
business logic correctness in financial/compliance code, anything Pierre flags as high-stakes.
