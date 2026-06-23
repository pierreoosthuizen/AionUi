---
name: apply-logging
description: >
  Apply structured logging to code files following Pierre's logging strategy.
  Use this skill whenever Pierre asks to "add logging", "apply logging",
  "add logs", "inject logging", "add log statements", or mentions wanting
  logging in a service, class, or file. Also trigger when Pierre says things
  like "this needs logging", "can you log this", "wire up logging", or
  references the logging standard/strategy. Works with any programming language.
  Always use this skill for logging tasks — do not apply logging ad hoc
  without consulting these conventions.
---

# apply-logging

Applies structured logging to code files using a consistent strategy across
all languages. The goal is uniform, useful logging — every service should tell
a clear story through its logs without being noisy.

---

## Step 1 — Read the logging strategy

Read the bundled reference before making any changes:

```
references/logging-strategy.md
```

This table is the single source of truth for which log level to use. Commit
it to memory for the duration of the task.

---

## Step 2 — Identify the language and logging tool

Read the target file(s) and determine the language. Then identify which
logging tool is already in use in the project by checking imports, dependencies,
or build files.

| Language      | Preferred tool    | Structured format          |
| ------------- | ----------------- | -------------------------- |
| C# / .NET     | Serilog `ILogger` | `{PropertyName}` templates |
| Java / Kotlin | SLF4J + Logback   | `{}` placeholders          |
| Python        | loguru            | `{}` f-string style        |
| Swift         | os.Logger / OSLog | String interpolation       |
| TypeScript/JS | pino or winston   | Object metadata            |
| Go            | slog or zap       | Key-value pairs            |
| Rust          | tracing           | `field = value` syntax     |

If the project already uses a different logging tool, follow the existing
convention rather than switching. If you cannot determine the logging tool
from the codebase, ask Pierre which one to use before proceeding.

---

## Step 3 — Inject the logger

Use dependency injection wherever the language supports it. The logger should
be an explicit dependency, not a global or static reference.

### Injection patterns by language

**C# / .NET (Serilog)**

```csharp
// Constructor injection with default fallback
public class MyService : IMyService
{
    private readonly ILogger _logger;

    public MyService() : this(Log.Logger) { }

    public MyService(ILogger logger)
    {
        _logger = logger
            ?? throw new ArgumentNullException(nameof(logger));
    }
}
```

**Java (SLF4J)**

```java
// Constructor injection
private final Logger logger;

public MyService(Logger logger) {
    this.logger = Objects.requireNonNull(logger);
}
```

**Python (loguru)**

```python
# loguru uses a global `logger` by default — this is acceptable
# because loguru's design is singleton-based
from loguru import logger
```

**Swift (os.Logger)**

```swift
private let logger: Logger

init(logger: Logger = Logger(subsystem: "com.app", category: "MyService")) {
    self.logger = logger
}
```

**TypeScript (pino)**

```typescript
private readonly logger: Logger;

constructor(logger: Logger) {
    this.logger = logger;
}
```

If the class already has a logger, do not add a second one. Use what exists.

---

## Step 4 — Place log statements

Apply logging at these specific points, using the level from the strategy
table. Do not scatter logs everywhere — log at boundaries, not inside loops
or trivial getters.

### Where to log

**Public method entry** — `DEBUG` level, log the method name and key parameters.
This is the "detailed execution flow" from the strategy. Skip for trivial
accessors (getters, property reads).

```csharp
_logger.Debug("Opening mod zip archive '{ZipPath}'", zipPath);
```

**Successful completion** — `DEBUG` or `INFO` depending on significance.
Use `INFO` for operations that create, update, or delete something. Use
`DEBUG` for reads and queries.

```csharp
// INFO — creating something
_logger.Information("Created user account for {Email}", email);

// DEBUG — reading something
_logger.Debug("Read INI value for [{Section}]{Key}", section, key);
```

**Recoverable failures** — `WARNING` level. The operation didn't fully succeed
but the system can continue.

```csharp
_logger.Warning("Retry {Attempt} of {Max} for {Url}", attempt, max, url);
```

**Unrecoverable errors** — `ERROR` level. Log before throwing or re-throwing.
Include the exception object so stack traces are captured.

```csharp
_logger.Error(exception, "Failed to read INI [{Section}]{Key}", section, key);
```

**System lifecycle** — `INFO` level for startup and shutdown.

```csharp
_logger.Information("Application starting, version {Version}", version);
_logger.Information("Shutting down gracefully");
```

### Where NOT to log

- Inside tight loops (performance impact)
- In pure functions with no side effects
- On every branch of simple if/else logic
- Redundantly — if a caller logs the error, the callee doesn't need to also
  log it. Pick one level to own the log.
- Sensitive data — never log passwords, tokens, PII, or full request bodies

### Controlled exceptions

When a method throws an exception as part of its contract (e.g., validation
errors like `ArgumentException` or `KeyNotFoundException`), do not log these
as `ERROR`. They are expected control flow, not failures. Structure catch
blocks to let them propagate cleanly:

```csharp
catch (KeyNotFoundException)
{
    // Expected validation path — propagate without error logging
    throw;
}
catch (Exception ex)
{
    _logger.Error(ex, "Failed to process {Item}", item);
    throw;
}
```

---

## Step 5 — Enforce structured logging

Always use structured log templates, never string concatenation or
interpolation. This enables log sinks to index and filter on field values.

**Correct:**

```csharp
_logger.Debug("Parsed mod '{Title}' v{Version} by {Author}", title, version, author);
```

**Wrong:**

```csharp
_logger.Debug($"Parsed mod '{title}' v{version} by {author}");  // NO — interpolation
_logger.Debug("Parsed mod '" + title + "'");                     // NO — concatenation
```

The same principle applies across languages:

- Java SLF4J: `logger.info("Created {} with id {}", type, id);`
- Python loguru: `logger.info("Created {} with id {}", type, id)`
- Go slog: `slog.Info("created item", "type", itemType, "id", id)`

---

## Step 6 — Verify

After applying logging:

1. Build the project to confirm no compilation errors
2. Run existing tests to confirm nothing broke
3. Review each log statement against the strategy table — is the level correct?

---

## Log message style guide

- Start with a verb or gerund: "Opening...", "Created...", "Failed to..."
- Use PascalCase for Serilog property names: `{ZipPath}`, `{UserId}`
- Keep messages under 80 characters where possible
- Include enough context to diagnose without the code: which resource, which
  identifier, which operation
- Use single quotes around string values in messages: `'{FileName}'`
