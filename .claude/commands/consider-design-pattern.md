---
description: Review code for opportunities to apply GoF design patterns or Fowler Analysis Patterns. Use when asked to review, refactor, or improve a piece of code with design patterns in mind. Always presents a no-change option if patterns would not genuinely improve the code.
allowed-tools: Read, Write, Edit, Glob, Bash
---

Review the code at $ARGUMENTS for design pattern opportunities.

## Reference

Read ~/.claude/commands/references/design-pattern-selection-guide.md before starting.
It contains the combined GoF and Fowler pattern selection guides with problem signals
and benefits for each pattern.

## Guiding Principle

A design pattern is only worth applying if it genuinely improves at least one of:

- **Maintainability** — easier to change or extend in future
- **Readability** — clearer intent, easier for another developer to understand
- **Flexibility** — behaviour can vary without modifying existing code
- **Performance** — measurably better at runtime (rare for structural patterns)

If none of these improve, do not apply the pattern. Over-engineering with patterns
where they are not needed produces code that is harder to read and maintain, not easier.
Always present "No change" as a valid and first-class option.

## Process

### 1. Read the target file(s) in full

Understand what the code does before looking for patterns. Note:

- The language and platform (Java, Kotlin, Swift, Python, etc.)
- The domain context (is this a domain model, a service layer, UI logic, infrastructure?)
- The size and complexity — simple code rarely benefits from structural patterns

### 2. Identify candidate signals

Work through the combined signals table in the reference doc and note which
signals appear in the code:

- Large if/switch blocks dispatching on type or state
- Constructors with many parameters
- Tight coupling between classes
- Features added by modifying existing classes rather than extending
- Raw numbers used for measured quantities
- Repeated concrete class instantiation
- Domain objects representing people, organisations, roles, or responsibilities
- Financial or ledger-like tracking without audit structure
- Event-driven updates scattered across many objects

### 3. Build a findings table

For each candidate signal found, assess the opportunity:

| Location                 | Signal observed         | Pattern candidate      | Would improve                | Confidence |
| ------------------------ | ----------------------- | ---------------------- | ---------------------------- | ---------- |
| ClassName:methodName     | Large type switch       | Strategy               | Maintainability, Flexibility | High       |
| OrderService constructor | 7 parameters            | Builder                | Readability                  | Medium     |
| UserRepository           | Direct DB instantiation | Proxy / Factory Method | Testability                  | High       |

Confidence levels:

- **High** — clear signal, well-established pattern fit, benefit is obvious
- **Medium** — pattern could help but depends on how the code evolves
- **Low** — pattern is possible but would add complexity; probably not worth it

### 4. Present options to Pierre

For each candidate, present:

1. What was observed
2. Which pattern applies and why
3. What specifically would improve (maintainability / readability / flexibility / performance)
4. What the trade-off or cost is (added classes, indirection, learning curve)

Always include as the final option:

> **Option: No change**
> The current code is clear and straightforward. Introducing a pattern here would add
> structural complexity without a corresponding improvement in any quality dimension.
> Recommend leaving as-is.

Ask Pierre to confirm which options (if any) to implement before writing any code.

### 5. Implement confirmed patterns

Apply only the patterns Pierre has confirmed. For each:

- Use idiomatic implementations for the detected language
- Preserve all existing behaviour — structural refactor only unless Pierre asks otherwise
- Add a brief comment at the pattern entry point explaining which pattern it is and why
- Keep the change minimal — introduce only what the pattern requires, no speculative additions

### 6. Summarise

After implementing, provide a short summary:

- Which patterns were applied and where
- Which options were declined (including "no change" if selected)
- Any follow-on opportunities flagged but deferred

## Rules

- Never apply a pattern without Pierre confirming it first
- Never apply a pattern that makes the code harder to read without a clear compensating benefit
- If the codebase is small or early-stage, note that patterns often become relevant as code grows — suggest revisiting rather than applying prematurely
- When multiple patterns are applicable to the same area, present them together and note any interactions
- Do not rename public APIs or change method signatures without explicit confirmation
- Low-confidence candidates should be flagged but not recommended — present them as "worth watching as code evolves"
