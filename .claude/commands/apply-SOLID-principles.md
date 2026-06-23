---
description: Review code and apply SOLID principles - identify violations and refactor to comply. Works with Java, Python, Swift, Kotlin, and other OO languages.
allowed-tools: Read, Write, Edit, Glob, Bash
---

Review the code at $ARGUMENTS and apply the SOLID principles where applicable.

## Reference

Read ~/.claude/commands/references/SOLID-principles.md before starting.
It contains language-agnostic definitions, violation signals, and the at-a-glance table.

## Language Detection

Before auditing, identify the language from the file extension or syntax and apply
the idiomatic patterns for that language:

| Language   | Interface/Abstraction      | Injection pattern     | DI framework        |
| ---------- | -------------------------- | --------------------- | ------------------- |
| Java       | interface / abstract class | Constructor injection | Spring, Guice       |
| Kotlin     | interface / abstract class | Constructor injection | Hilt, Koin          |
| Swift      | protocol                   | Initialiser injection | Manual / Swinject   |
| Python     | ABC / Protocol (typing)    | **init** parameter    | Manual / injector   |
| TypeScript | interface / abstract class | Constructor injection | InversifyJS, NestJS |

Use the correct terminology for the detected language throughout the audit and refactor.

## Process

1. **Read the target file(s)** in full before making any changes.

2. **Identify the language** and note which abstractions and idioms apply.

3. **Audit against each principle** and determine whether a violation exists:

| Principle             | Violation signal                                                              |
| --------------------- | ----------------------------------------------------------------------------- |
| Single Responsibility | Class/function does more than one thing; multiple reasons to change           |
| Open/Closed           | Adding new behaviour requires editing existing code (if/switch/match on type) |
| Liskov Substitution   | Subtype breaks or weakens behaviour expected from its parent/protocol         |
| Interface Segregation | Interface/protocol forces implementors to provide methods they do not use     |
| Dependency Inversion  | High-level module directly instantiates or imports a concrete low-level class |

4. **Report findings before refactoring:**
   - List each violation with the class/function name, principle breached, and a one-line explanation
   - Note compliant principles explicitly
   - Ask Pierre to confirm which violations to fix before proceeding

5. **Refactor confirmed violations** using the minimum change that resolves the issue:
   - Extract interfaces, protocols, or abstract base classes as appropriate for the language
   - Split classes or functions with mixed responsibilities
   - Introduce constructor/initialiser injection to replace direct instantiation
   - Preserve all existing behaviour - structural changes only

6. **Summarise changes** - list each change made, which principle it addresses, and why
   the result is now compliant.

## Rules

- Fix one principle at a time when violations overlap - agree the order with Pierre
- Prefer small incremental changes over full rewrites
- Do not rename public API methods, fields, or protocol requirements without confirming with Pierre
- Use idiomatic patterns for the detected language - do not apply Java patterns to Python or Swift
- Add a brief inline comment where a structural pattern may not be immediately obvious
