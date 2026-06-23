---
description: Review code or a domain model for opportunities to apply Martin Fowler Analysis Patterns. Use when asked to review, refactor, or improve domain modelling code in enterprise, financial, healthcare, or HR domains. Always presents a no-change option if patterns would not genuinely improve the code.
allowed-tools: Read, Write, Edit, Glob, Bash
---

Review the code or domain model at $ARGUMENTS for Analysis Pattern opportunities.

## Reference

Read ~/.claude/commands/references/design-pattern-selection-guide.md before starting.
Focus on the Analysis Patterns (Fowler) and Combined Signals sections.
Full pattern details: Design/Analysis Patterns - Martin Fowler.md (Second Brain)

## Guiding Principle

Analysis Patterns are domain modelling patterns. Only recommend applying one if it
genuinely improves at least one of:

- Maintainability -- the domain model is easier to evolve as requirements change
- Readability -- the model intent better reflects the real-world concepts it represents
- Flexibility -- new domain variations can be accommodated without structural changes
- Correctness -- the model prevents invalid states or misuse (e.g. unit-less measurements)

If none of these improve, do not recommend the pattern. Always present No Change as
a valid and equal option.

## Context Sensitivity

Analysis Patterns apply most in:

- Enterprise / business domains -- organisations, parties, roles, responsibilities
- Financial systems -- accounts, transactions, ledgers, posting rules
- Healthcare / scientific -- measurements, observations, protocols
- Product / catalogue systems -- product types, packages, bundles
- Planning systems -- plans, projections, resource allocation
- Integration / MDM -- multiple identifiers, object merging, cross-system identity

If the code is infrastructure, UI, or a utility layer with no domain modelling,
say so and suggest /consider-design-pattern instead.

## Process

### 1. Read the target file(s) in full

Understand the domain being modelled before looking for patterns. Note:

- What real-world entities and relationships are being represented
- The language and platform
- Whether this is a domain model, service, or infrastructure code

### 2. Identify candidate signals

| Signal in code                                                 | Likely pattern             |
| -------------------------------------------------------------- | -------------------------- |
| Person and Organisation as separate, parallel classes          | Party                      |
| Responsibility tracked as a string or enum                     | Accountability             |
| Numeric values stored without units                            | Quantity + Measurement     |
| Multiple hardcoded org hierarchy representations               | Organisation Structure     |
| Product description fields duplicated across instances         | Product + Product Type     |
| Balance or running total without entry history                 | Account + Transactions     |
| Accounting rules embedded in business logic                    | Posting Rules              |
| Business rules hardcoded, requiring code changes to update     | Knowledge Level            |
| Same entity has different IDs in different parts of the system | Identification Scheme      |
| Plans stored but no comparison to actuals                      | Plan + Resource Allocation |
| Names as a single string with no history or type               | Name                       |
| Two records discovered to be the same real entity              | Object Merge / Equivalence |

### 3. Build a findings table

| Location          | Signal observed                | Pattern candidate      | Would improve                | Confidence |
| ----------------- | ------------------------------ | ---------------------- | ---------------------------- | ---------- |
| PatientRecord     | Weight stored as Double        | Quantity + Measurement | Correctness, Maintainability | High       |
| CustomerService   | Person/Org in parallel if/else | Party                  | Readability, Flexibility     | High       |
| AccountingService | Rule logic in calculateFee()   | Posting Rules          | Maintainability, Flexibility | Medium     |

Confidence: High = immediate benefit; Medium = depends on domain growth; Low = flag only

### 4. Flag foundational patterns first

Flag these before presenting other candidates -- they affect many downstream parts:

- Party -- all person/org handling changes downstream
- Knowledge Level -- rule configuration changes across the domain
- Account + Transactions -- all balance tracking changes

Recommend Pierre consider scope and migration cost before confirming these.

### 5. Present options to Pierre

For each candidate present: what was observed, which pattern applies, what improves,
what the cost is, and whether it is foundational.

Always include as the final option:

Option: No change
The current model is appropriate for its scope. Introducing this pattern would add
abstraction without a corresponding improvement at this stage. Recommend revisiting
if the domain grows in the direction these patterns address.

Ask Pierre to confirm before writing any code.

### 6. Implement confirmed patterns

- Use idiomatic implementations for the detected language
- Preserve all existing behaviour
- Add a brief comment at each abstraction naming the pattern
- Keep changes minimal

### 7. Summarise

- Patterns applied and where
- Options declined (including No Change if selected)
- Foundational patterns deferred and what would trigger revisiting them

## Rules

- Never apply a pattern without confirmation
- If no domain modelling is present, say so and suggest /consider-design-pattern
- Low-confidence candidates are flagged as worth watching -- not recommended
- Do not rename public domain entities or methods without explicit confirmation
- Scope foundational changes clearly before Pierre confirms
- A pattern that makes a simple model harder to understand is a net negative
