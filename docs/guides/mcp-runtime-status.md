# MCP runtime status in the settings tab

Settings → Tools → MCP lists each configured MCP server with a **runtime status**
badge next to its name: 🟢 Loaded / 🔴 Failed / 🟡 Unsupported. This is the
actual load result the embedded agent reported per conversation — distinct from
the existing manual config-test icon on the same row.

## Two different statuses, same row

- **Manual test status** (existing) — the icon + Refresh button. Reflects a
  one-off config check (`last_test_status`); says nothing about live sessions.
  Stays "Not tested" until you click Refresh.
- **Runtime status** (this feature) — a colored word badge. Aggregates the
  per-conversation `extra.mcp_statuses` the agent emits (the same data shown in
  the in-chat "Loaded MCP" popover), now mirrored in Settings.

## Aggregation

Runtime status is per-conversation, but the Settings tab is global, so the badge
aggregates across the user's conversations:

- Counts each server's `loaded` / `failed` / `unsupported` occurrences.
- Single displayed status by priority: **loaded > failed > unsupported** — if a
  server loaded in any conversation its config works, so green wins; the tooltip
  still shows the full breakdown (`loaded N, failed N, unsupported N`).
- Servers never seen in any conversation show no runtime badge (only the
  existing manual-test icon).

Servers are matched by both `id` and `name` so a Settings server resolves
whichever key the conversation snapshot carried.

## Data flow

```
useMcpRuntimeStatus()
  └─ ipcBridge.database.getUserConversations({ limit: 200 })
       └─ for each conversation: extra.mcp_statuses[] → tally by id & name
            └─ Map<key, { status, loaded, failed, unsupported }>

McpManagement → runtimeStatusFor(server) → McpServerItem → McpServerHeader (badge)
```

Fetched once on mount (`refresh()` re-pulls). One page of 200 conversations is a
deliberate ceiling — runtime status is a glance, not an audit; reopen the tab to
refresh.

## Files

| File | Role |
| --- | --- |
| `packages/desktop/src/renderer/hooks/mcp/useMcpRuntimeStatus.ts` | Fetch + aggregate; exports `McpRuntimeStatus` |
| `packages/desktop/src/renderer/hooks/mcp/index.ts` | Barrel export |
| `packages/desktop/src/renderer/pages/settings/ToolsSettings/McpManagement.tsx` | Wires the hook, passes per-server status |
| `packages/desktop/src/renderer/pages/settings/ToolsSettings/McpServerItem.tsx` | Threads `runtimeStatus` through |
| `packages/desktop/src/renderer/pages/settings/ToolsSettings/McpServerHeader.tsx` | Renders the badge + tooltip |
| `packages/desktop/src/renderer/services/i18n/locales/en-US/settings.json` | `settings.mcpRuntimeStatusTooltip` |
| `tests/unit/renderer/useMcpRuntimeStatus.dom.test.ts` | Aggregation + error-path tests |

The status words reuse the existing `conversation.mcp.status.*` i18n keys (the
same strings the in-chat popover uses).
