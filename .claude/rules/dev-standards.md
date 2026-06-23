# Development Standards

## Code Quality

- No code samples unless explicitly requested
- Write comprehensive error handling
- Include proper logging at appropriate levels
- Follow language-specific linting rules
- Don't refactor things that aren't broken. Touch only what your changes require.
- When your changes create orphans, remove them. Don't remove pre-existing dead code unless asked.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.
- Always provide code review feedback using SOLID principles
- **Ship working over clean.** When in doubt between cleaner code and shipping working code, ship working. Refactor on the third repetition, not the second. Optimise after measurement, not before. Read AI-generated code as if a stranger wrote it before trusting it.

## Testing

Before writing any code:

1. State how you will verify this change works (test, bash command, browser check, etc.)
2. Write tests on verification step 1 first
3. Then implement code
4. Run verification and iterate until it passes
5. Always add a concise 1–2 line doc comment to every test method describing what it verifies
6. Use the language-standard format (`///` in Swift, `/** */` or `///` in Java/Kotlin, `"""docstring"""` in Python, `///` in Rust, `//` JSDoc in JS/TS, etc.)

## GIT Conventions

- Branch naming: `feature/*`, `bugfix/*`, `docs/*`
- Conventional commits format; imperative mood ("Add feature" not "Added feature")
- Atomic, focused commits — message explains why, not what
- Do not commit without running typechecks and tests
- Do not include Claude as contributor to Discovery and Calypso commits

## Technology-Specific Guidelines

When working with specific technologies, reference:

- ~/.claude/docs/java.md - Java best practices
- ~/.claude/docs/android.md - Android development standards
- ~/.claude/docs/python.md - Python conventions and tools
- ~/.claude/docs/swift.md - Swift development guidelines
- ~/.claude/docs/flutter.md - Flutter development guidelines
- ~/.claude/docs/dart.md - Dart language conventions
