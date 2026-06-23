// G1 gate: mcpService.toggleServer (POST /api/mcp/servers/{id}/toggle) toggles the
// enabled flag on aioncore, which tears down and re-initialises the connection.
// Toggling off then on therefore IS a reconnect; we follow with testMcpConnection
// to surface the result immediately in the UI.

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mcpService } from '@/common/adapter/ipcBridge';
import type { IMcpServer } from '@/common/config/storage';

/** Delay between toggle-off and toggle-on to allow aioncore to tear down cleanly. */
const RECONNECT_TOGGLE_DELAY_MS = 150;

type ReconnectResult = { success: boolean; error?: string };

/**
 * Hook that exposes a reconnect action for a single MCP server.
 * Implements: toggle-off → wait → toggle-on → test-connection.
 */
export const useMcpReconnect = (
  setMcpServers: React.Dispatch<React.SetStateAction<IMcpServer[]>>,
  onTestConnection: (server: IMcpServer, options?: { notify: boolean }) => Promise<void>
) => {
  const { t } = useTranslation();
  const [reconnectingServers, setReconnectingServers] = useState<Record<string, boolean>>({});

  const handleReconnect = useCallback(
    async (server: IMcpServer): Promise<ReconnectResult> => {
      if (reconnectingServers[server.id]) {
        return { success: false, error: 'Reconnect already in progress' };
      }

      setReconnectingServers((prev) => ({ ...prev, [server.id]: true }));

      try {
        // Ensure the server is enabled before we start so the final state is "on".
        // Toggle off (if currently on), then back on.
        if (server.enabled) {
          await mcpService.toggleServer.invoke({ id: server.id });
        }

        await new Promise<void>((resolve) => setTimeout(resolve, RECONNECT_TOGGLE_DELAY_MS));

        // Toggle back on (or on from disabled state).
        const reconnected = await mcpService.toggleServer.invoke({ id: server.id });

        // Sync the local UI state with the returned server record.
        setMcpServers((prev) => prev.map((s) => (s.id === reconnected.id ? { ...s, ...reconnected } : s)));

        // Run connection test to update status badge — suppress its own toast;
        // the caller (McpManagement) surfaces the reconnect-level message.
        await onTestConnection(reconnected, { notify: false });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.mcpReconnectError');
        return { success: false, error: message };
      } finally {
        setReconnectingServers((prev) => ({ ...prev, [server.id]: false }));
      }
    },
    [reconnectingServers, setMcpServers, onTestConnection, t]
  );

  return { reconnectingServers, handleReconnect };
};
