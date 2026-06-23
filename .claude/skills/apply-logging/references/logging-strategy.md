## Logging Standard — Level Guide

| Action                      | Log Level | Purpose                                 |
| --------------------------- | --------- | --------------------------------------- |
| **Starting something**      | `INFO`    | System events (e.g., "Initializing...") |
| **Shutting something down** | `INFO`    | System shutdown events                  |
| **Creating something**      | `INFO`    | Logging successful object creation      |
| **Updating something**      | `INFO`    | Logging updates to important records    |
| **Deleting something**      | `INFO`    | Logging data deletions                  |
| **Recoverable failure**     | `WARNING` | Issues that don't break functionality   |
| **Unexpected behaviour**    | `WARNING` | Anomalies that may indicate issues      |
| **Errors (unrecoverable)**  | `ERROR`   | Fatal issues that require intervention  |
| **Detailed execution flow** | `DEBUG`   | Debugging non-critical issues           |
| **Deep function tracing**   | `TRACE`   | Step-by-step method execution           |
