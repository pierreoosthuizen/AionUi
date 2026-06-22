/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Switch, Message, Empty, Spin, Tooltip, Popconfirm, Tag } from '@arco-design/web-react';
import { Delete, PlayOne } from '@icon-park/react';
import { useLayoutContext } from '@renderer/hooks/context/LayoutContext';
import { useAllCronJobs } from '@renderer/pages/cron/useCronJobs';
import { formatSchedule, formatNextRun } from '@renderer/pages/cron/cronUtils';
import { ipcBridge } from '@/common';
import { systemSettings, type ICronJob, type IPeerTask } from '@/common/adapter/ipcBridge';
import { configService } from '@/common/config/configService';
import { useConversationAgents } from '@renderer/pages/conversation/hooks/useConversationAgents';
import CronStatusTag from './CronStatusTag';
import CreateTaskDialog from './CreateTaskDialog';
import { getJobAgentMeta } from './jobAgentMeta';

const WEEKDAY_KEY: Record<string, string> = { MON: 'monday', TUE: 'tuesday', WED: 'wednesday', THU: 'thursday', FRI: 'friday', SAT: 'saturday', SUN: 'sunday' };

/** Human schedule line for a peer task — plain frequency, no cron expr (ADR-0002 §5). */
function formatPeerSchedule(task: IPeerTask, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (task.frequency) {
    case 'manual':
      return t('cron.page.scheduleDesc.manual');
    case 'hourly':
      return t('cron.page.scheduleDesc.hourly');
    case 'daily':
      return t('cron.page.scheduleDesc.dailyAt', { time: task.time ?? '09:00' });
    case 'weekdays':
      return t('cron.page.scheduleDesc.weekdaysAt', { time: task.time ?? '09:00' });
    case 'weekly':
      return t('cron.page.scheduleDesc.weeklyAt', { day: t(`cron.page.weekday.${WEEKDAY_KEY[task.weekday ?? 'MON']}`), time: task.time ?? '09:00' });
    default:
      return '';
  }
}

const ScheduledTasksPage: React.FC = () => {
  const layout = useLayoutContext();
  const isMobile = layout?.isMobile ?? false;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobs, loading, pauseJob, resumeJob } = useAllCronJobs();
  const { cliAgents, presetAssistants } = useConversationAgents();
  const { data: peerTasks = [], mutate: refetchPeerTasks } = useSWR<IPeerTask[]>('peer-task:list', () => ipcBridge.peerTask.list.invoke());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeerTask, setEditingPeerTask] = useState<IPeerTask | undefined>(undefined);
  const [keepAwake, setKeepAwake] = useState(false);

  const openCreate = useCallback(() => {
    setEditingPeerTask(undefined);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingPeerTask(undefined);
    void refetchPeerTasks();
  }, [refetchPeerTasks]);

  const handleEditPeer = useCallback((task: IPeerTask) => {
    setEditingPeerTask(task);
    setDialogOpen(true);
  }, []);

  const handleTogglePeer = useCallback(
    async (task: IPeerTask) => {
      try {
        await ipcBridge.peerTask.update.invoke({ id: task.id, updates: { enabled: !task.enabled } });
        void refetchPeerTasks();
      } catch (err) {
        Message.error(String(err));
      }
    },
    [refetchPeerTasks]
  );

  const handleDeletePeer = useCallback(
    async (task: IPeerTask) => {
      try {
        await ipcBridge.peerTask.remove.invoke({ id: task.id });
        void refetchPeerTasks();
      } catch (err) {
        Message.error(String(err));
      }
    },
    [refetchPeerTasks]
  );

  const handleRunPeerNow = useCallback(async (task: IPeerTask) => {
    try {
      const result = await ipcBridge.peerTask.runNow.invoke({ id: task.id });
      if (result.status === 'sent') Message.success(t('cron.page.peer.runSent'));
      else if (result.status === 'skipped') Message.warning(t('cron.page.peer.runSkipped'));
      else Message.error(result.error || t('cron.page.peer.runError'));
    } catch (err) {
      Message.error(String(err));
    }
  }, [t]);

  useEffect(() => {
    setKeepAwake(configService.get('system.keepAwake') ?? false);
  }, []);

  const handleKeepAwakeChange = useCallback(async (enabled: boolean) => {
    setKeepAwake(enabled);
    configService.setLocal('system.keepAwake', enabled);
    try {
      await systemSettings.setKeepAwake.invoke({ enabled });
    } catch (err) {
      setKeepAwake(!enabled);
      configService.setLocal('system.keepAwake', !enabled);
      Message.error(String(err));
    }
  }, []);

  const handleGoToDetail = useCallback(
    (job: ICronJob) => {
      navigate(`/scheduled/${job.id}`);
    },
    [navigate]
  );

  const handleToggleEnabled = useCallback(
    async (job: ICronJob) => {
      try {
        if (job.enabled) {
          await pauseJob(job.id);
          Message.success(t('cron.pauseSuccess'));
        } else {
          await resumeJob(job.id);
          Message.success(t('cron.resumeSuccess'));
        }
      } catch (err) {
        Message.error(String(err));
      }
    },
    [pauseJob, resumeJob, t]
  );

  return (
    <div
      className={classNames(
        'w-full min-h-full box-border overflow-y-auto',
        isMobile ? 'px-16px py-14px' : 'px-12px py-24px md:px-40px md:py-32px'
      )}
    >
      <div
        className={classNames(
          'mx-auto flex w-full max-w-800px box-border flex-col',
          isMobile ? 'gap-14px' : 'gap-16px'
        )}
      >
        <div className={classNames('flex w-full flex-col', isMobile ? 'gap-6px' : 'gap-8px')}>
          <div className='flex w-full items-start justify-between gap-12px sm:gap-16px max-[520px]:flex-wrap'>
            <h1
              className={classNames(
                'm-0 min-w-0 flex-1 font-bold text-t-primary',
                isMobile ? 'text-24px leading-[1.2]' : 'text-28px leading-[1.15]'
              )}
            >
              {t('cron.scheduledTasks')}
            </h1>
            <Button type='primary' shape='round' className='shrink-0' onClick={openCreate}>
              {t('cron.page.newTask')}
            </Button>
          </div>
          <p
            className={classNames(
              'm-0 w-full text-t-secondary',
              isMobile ? 'text-13px leading-20px' : 'text-14px leading-22px'
            )}
          >
            {t('cron.page.description')}
          </p>
        </div>

        <div className='grid w-full box-border grid-cols-[minmax(0,1fr)_auto] items-center gap-x-12px gap-y-10px rounded-12px border border-solid border-[var(--color-border-2)] bg-fill-2 px-14px py-12px sm:rounded-14px sm:px-16px max-[520px]:grid-cols-1'>
          <span
            className={classNames(
              'min-w-0 text-t-primary',
              isMobile ? 'text-12px leading-18px' : 'text-13px leading-20px'
            )}
          >
            {t('cron.page.awakeBanner')}
          </span>
          <div className='justify-self-end max-[520px]:justify-self-start'>
            <Tooltip content={t('cron.page.keepAwakeTooltip')}>
              <div className='flex items-center gap-8px text-t-secondary text-12px leading-18px sm:text-13px'>
                <span>{t('cron.page.keepAwake')}</span>
                <Switch size='small' checked={keepAwake} onChange={handleKeepAwakeChange} />
              </div>
            </Tooltip>
          </div>
        </div>

        {loading ? (
          <div className='flex min-h-220px items-center justify-center rounded-16px border border-dashed border-border-2 bg-fill-1'>
            <Spin />
          </div>
        ) : jobs.length === 0 && peerTasks.length === 0 ? (
          <div className='flex min-h-220px items-center justify-center rounded-16px border border-dashed border-border-2 bg-fill-1'>
            <Empty description={t('cron.noTasks')} />
          </div>
        ) : (
          <div
            className={classNames(
              'grid w-full items-start grid-cols-1 gap-12px',
              isMobile ? '' : 'sm:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {jobs.map((job) => {
              const agentMeta = getJobAgentMeta(job, cliAgents, presetAssistants);
              const isManualOnly = job.schedule.kind === 'cron' && !job.schedule.expr;
              const executionModeLabel =
                job.target.execution_mode === 'new_conversation'
                  ? t('cron.page.form.newConversation')
                  : t('cron.page.form.existingConversation');

              return (
                <div
                  key={job.id}
                  className={classNames(
                    'group flex cursor-pointer flex-col border border-solid border-[var(--color-border-2)] bg-fill-1 transition-colors duration-200 hover:border-[var(--color-border-3)] hover:shadow-sm',
                    isMobile ? 'rounded-12px px-16px py-16px' : 'rounded-12px px-20px py-18px'
                  )}
                  onClick={() => handleGoToDetail(job)}
                >
                  <div className='mb-12px flex items-center justify-between gap-8px'>
                    <span
                      className={classNames(
                        'mr-8px min-w-0 flex-1 font-medium text-t-primary',
                        isMobile ? 'truncate text-14px leading-20px' : 'truncate text-15px leading-22px'
                      )}
                    >
                      {job.name}
                    </span>
                    <Tag size='small' color='arcoblue'>
                      {t('cron.page.badge.agent')}
                    </Tag>
                    <CronStatusTag job={job} />
                  </div>

                  <div
                    className={classNames(
                      'min-w-0 break-words text-t-secondary',
                      isMobile ? 'text-13px leading-20px' : 'text-14px leading-22px'
                    )}
                    title={formatSchedule(job, t)}
                  >
                    {formatSchedule(job, t)}
                  </div>

                  <div
                    className='mt-16px min-w-0 break-words text-t-secondary text-13px leading-20px'
                    title={
                      job.state.next_run_at_ms ? `${t('cron.nextRun')} ${formatNextRun(job.state.next_run_at_ms)}` : '-'
                    }
                  >
                    {job.state.next_run_at_ms ? `${t('cron.nextRun')} ${formatNextRun(job.state.next_run_at_ms)}` : '-'}
                  </div>

                  <div className='mt-14px flex items-center justify-between gap-10px'>
                    <div className='min-w-0 flex items-center gap-6px text-12px leading-18px text-t-secondary'>
                      {agentMeta.name ? (
                        <Tooltip content={agentMeta.name}>
                          <div className='flex h-16px w-16px shrink-0 items-center justify-center text-t-secondary'>
                            {agentMeta.logo ? (
                              <img
                                src={agentMeta.logo}
                                alt={agentMeta.name}
                                className='h-16px w-16px shrink-0 rounded-50%'
                              />
                            ) : (
                              <span className='flex h-16px w-16px items-center justify-center rounded-50% text-10px font-medium text-t-secondary'>
                                {agentMeta.name.slice(0, 1)}
                              </span>
                            )}
                          </div>
                        </Tooltip>
                      ) : null}
                      <span className='min-w-0 truncate'>{executionModeLabel}</span>
                    </div>

                    <div className='shrink-0' onClick={(e) => e.stopPropagation()}>
                      {!isManualOnly && (
                        <Switch size='small' checked={job.enabled} onChange={() => handleToggleEnabled(job)} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {peerTasks.map((task) => {
              const nextRun = task.enabled && task.next_run_at_ms ? `${t('cron.nextRun')} ${formatNextRun(task.next_run_at_ms)}` : '-';
              return (
                <div
                  key={task.id}
                  className={classNames(
                    'group flex cursor-pointer flex-col border border-solid border-[var(--color-border-2)] bg-fill-1 transition-colors duration-200 hover:border-[var(--color-border-3)] hover:shadow-sm',
                    isMobile ? 'rounded-12px px-16px py-16px' : 'rounded-12px px-20px py-18px'
                  )}
                  onClick={() => handleEditPeer(task)}
                >
                  <div className='mb-12px flex items-center justify-between gap-8px'>
                    <span
                      className={classNames(
                        'mr-8px min-w-0 flex-1 font-medium text-t-primary',
                        isMobile ? 'truncate text-14px leading-20px' : 'truncate text-15px leading-22px'
                      )}
                    >
                      {task.name}
                    </span>
                    <Tag size='small' color='purple'>
                      {t('cron.page.badge.peer')}
                    </Tag>
                  </div>

                  <div
                    className={classNames(
                      'min-w-0 break-words text-t-secondary',
                      isMobile ? 'text-13px leading-20px' : 'text-14px leading-22px'
                    )}
                  >
                    {formatPeerSchedule(task, t)}
                  </div>

                  <div className='mt-16px min-w-0 break-words text-t-secondary text-13px leading-20px'>{nextRun}</div>

                  <div className='mt-14px flex items-center justify-between gap-10px'>
                    <Tooltip content={task.peer_label}>
                      <span className='min-w-0 truncate text-12px leading-18px text-t-secondary'>{task.peer_label}</span>
                    </Tooltip>

                    <div className='flex shrink-0 items-center gap-10px' onClick={(e) => e.stopPropagation()}>
                      <Tooltip content={t('cron.page.peer.runNow')}>
                        <PlayOne size='16' className='cursor-pointer text-t-secondary hover:text-t-primary' onClick={() => handleRunPeerNow(task)} />
                      </Tooltip>
                      <Popconfirm title={t('cron.page.peer.deleteConfirm')} onOk={() => handleDeletePeer(task)}>
                        <Delete size='16' className='cursor-pointer text-t-secondary hover:text-red-5' />
                      </Popconfirm>
                      {task.frequency !== 'manual' && <Switch size='small' checked={task.enabled} onChange={() => handleTogglePeer(task)} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreateTaskDialog visible={dialogOpen} editPeerTask={editingPeerTask} onClose={closeDialog} />
      </div>
    </div>
  );
};

export default ScheduledTasksPage;
