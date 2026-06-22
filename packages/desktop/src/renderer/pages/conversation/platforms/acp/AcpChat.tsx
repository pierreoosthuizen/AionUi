/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IConversationMcpStatus } from '@/common/config/storage';
import { ConversationProvider } from '@/renderer/hooks/context/ConversationContext';
import { useTeamPermission } from '@/renderer/pages/team/hooks/TeamPermissionContext';
import type { TeamSendBoxRuntime } from '@/renderer/pages/team/components/teamSendRuntime';
import FlexFullContainer from '@renderer/components/layout/FlexFullContainer';
import MessageList from '@renderer/pages/conversation/Messages/MessageList';
import { ConversationArtifactProvider } from '@renderer/pages/conversation/Messages/artifacts';
import {
  MessageListLoadingProvider,
  MessageListProvider,
  useMessageLstCache,
} from '@renderer/pages/conversation/Messages/hooks';
import { usePendingConfirmationsRecovery } from '@renderer/pages/conversation/Messages/usePendingConfirmationsRecovery';
import { MetricsPanel, MetricsPanelButton, MOCK_METRICS_HISTORY } from '@renderer/pages/conversation/components/MetricsPanel';
import HOC from '@renderer/utils/ui/HOC';
import React, { useState } from 'react';
import AcpE2EStreamInjector from './AcpE2EStreamInjector';
import AcpSendBox from './AcpSendBox';
import { useAcpMessage } from './useAcpMessage';

const AcpChat: React.FC<{
  conversation_id: string;
  workspace?: string;
  backend: string;
  session_mode?: string;
  agent_name?: string;
  cron_job_id?: string;
  hideSendBox?: boolean;
  emptySlot?: React.ReactNode;
  loadedSkills?: string[];
  loadedMcpServers?: string[];
  loadedMcpStatuses?: IConversationMcpStatus[];
  teamSendMessage?: (payload: { input: string; files: string[] }) => Promise<void>;
  teamRuntime?: TeamSendBoxRuntime;
  assistantId?: string;
}> = ({
  conversation_id,
  workspace,
  backend,
  session_mode,
  agent_name,
  cron_job_id,
  hideSendBox,
  emptySlot,
  loadedSkills,
  loadedMcpServers,
  loadedMcpStatuses,
  teamSendMessage,
  teamRuntime,
  assistantId,
}) => {
  useMessageLstCache(conversation_id);
  usePendingConfirmationsRecovery(conversation_id);
  const teamPermission = useTeamPermission();
  const messageState = useAcpMessage(conversation_id, { skipWarmup: Boolean(teamPermission) });

  const [metricsOpen, setMetricsOpen] = useState(false);
  // TODO(reviewer): replace with useMetricsHistory(metricsOpen) once data branch merges
  const metricsHistory = MOCK_METRICS_HISTORY;

  return (
    <ConversationProvider
      value={{
        conversation_id: conversation_id,
        workspace,
        type: 'acp',
        cron_job_id,
        hideSendBox,
        loadedSkills,
        loadedMcpServers,
        loadedMcpStatuses,
        assistantId,
      }}
    >
      <ConversationArtifactProvider conversation_id={conversation_id}>
        {/*
         * Overflow-trap analysis:
         *   - FlexFullContainer renders `absolute size-full` internally and MessageList
         *     uses `overflow-y-auto` — any absolute child INSIDE FlexFullContainer would
         *     be clipped by that scroll context.
         *   - We anchor MetricsPanelButton + MetricsPanel at this outer flex column,
         *     which has NO overflow clip, so absolute children are never clipped.
         *   - `relative` added here so the absolutely-positioned button is contained.
         *   - The panel itself is a normal flex child (not absolute), so it shrinks the
         *     message list naturally without escaping the column.
         */}
        <div className='relative flex-1 flex flex-col px-20px min-h-0'>
          <FlexFullContainer>
            <MessageList className='flex-1' emptySlot={emptySlot} />
          </FlexFullContainer>
          <AcpE2EStreamInjector conversationId={conversation_id} />
          {/* Metrics panel — sits between the message list and the send box */}
          <MetricsPanel
            history={metricsHistory}
            visible={metricsOpen}
            onRequestHide={() => setMetricsOpen(false)}
          />
          {!hideSendBox && (
            <AcpSendBox
              conversation_id={conversation_id}
              backend={backend}
              session_mode={session_mode}
              agent_name={agent_name}
              workspacePath={workspace}
              messageState={messageState}
              teamSendMessage={teamSendMessage}
              teamRuntime={teamRuntime}
            ></AcpSendBox>
          )}
          {/* Trigger button — absolutely positioned bottom-right of this column */}
          <MetricsPanelButton open={metricsOpen} onClick={() => setMetricsOpen((v) => !v)} />
        </div>
      </ConversationArtifactProvider>
    </ConversationProvider>
  );
};

export default HOC.Wrapper(MessageListProvider, MessageListLoadingProvider)(AcpChat);
