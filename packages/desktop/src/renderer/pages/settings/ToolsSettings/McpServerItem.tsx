import { Collapse } from '@arco-design/web-react';
import React from 'react';
import type { IMcpServer } from '@/common/config/storage';
import McpServerHeader from './McpServerHeader';
import McpServerToolsList from './McpServerToolsList';
import type { McpOAuthStatus } from '@/renderer/hooks/mcp/useMcpOAuth';
import type { McpRuntimeStatus } from '@/renderer/hooks/mcp/useMcpRuntimeStatus';

interface McpServerItemProps {
  server: IMcpServer;
  isCollapsed: boolean;
  isTestingConnection: boolean;
  oauthStatus?: McpOAuthStatus;
  isLoggingIn?: boolean;
  isReconnecting?: boolean;
  runtimeStatus?: McpRuntimeStatus;
  /** Extension-contributed servers are read-only (no edit/delete) */
  isReadOnly?: boolean;
  onToggleCollapse: () => void;
  onTestConnection: (server: IMcpServer) => void;
  onEditServer: (server: IMcpServer) => void;
  onDeleteServer: (serverId: string) => void;
  onOAuthLogin?: (server: IMcpServer) => void;
  onReconnect?: (server: IMcpServer) => void;
}

const McpServerItem: React.FC<McpServerItemProps> = ({
  server,
  isCollapsed,
  isTestingConnection,
  oauthStatus,
  isLoggingIn,
  isReconnecting,
  runtimeStatus,
  isReadOnly,
  onToggleCollapse,
  onTestConnection,
  onEditServer,
  onDeleteServer,
  onOAuthLogin,
  onReconnect,
}) => {
  return (
    <Collapse
      key={server.id}
      activeKey={isCollapsed ? ['1'] : []}
      onChange={onToggleCollapse}
      className='mb-4 [&_div.arco-collapse-item-header-title]:flex-1'
    >
      <Collapse.Item
        header={
          <McpServerHeader
            server={server}
            isTestingConnection={isTestingConnection}
            oauthStatus={oauthStatus}
            isLoggingIn={isLoggingIn}
            isReconnecting={isReconnecting}
            runtimeStatus={runtimeStatus}
            isReadOnly={isReadOnly}
            onTestConnection={onTestConnection}
            onEditServer={onEditServer}
            onDeleteServer={onDeleteServer}
            onOAuthLogin={onOAuthLogin}
            onReconnect={onReconnect}
          />
        }
        name='1'
        className={'[&_div.arco-collapse-item-content-box]:py-3'}
      >
        <McpServerToolsList server={server} />
      </Collapse.Item>
    </Collapse>
  );
};

export default McpServerItem;
