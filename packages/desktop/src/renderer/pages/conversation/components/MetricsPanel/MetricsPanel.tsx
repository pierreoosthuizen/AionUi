/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChartSeries, MetricsHistory } from '@/common/types/metricsPanel';
import { Button, Tabs } from '@arco-design/web-react';
import { Close, PreviewClose, PreviewOpen } from '@icon-park/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BarChart from './BarChart';

const TabPane = Tabs.TabPane;

/** localStorage key for persisting the panel height. */
const HEIGHT_STORAGE_KEY = 'metrics-panel-height-px';
const DEFAULT_HEIGHT = 220;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 480;

function readPersistedHeight(): number {
  try {
    const raw = localStorage.getItem(HEIGHT_STORAGE_KEY);
    if (raw === null) return DEFAULT_HEIGHT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_HEIGHT;
    return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n));
  } catch {
    return DEFAULT_HEIGHT;
  }
}

function persistHeight(h: number): void {
  try {
    localStorage.setItem(HEIGHT_STORAGE_KEY, String(h));
  } catch {
    // ignore quota errors
  }
}

type HiddenCharts = Set<string>;

type ChartToggleButtonProps = {
  chartKey: string;
  hidden: boolean;
  onToggle: (key: string) => void;
};

const ChartToggleButton: React.FC<ChartToggleButtonProps> = ({ chartKey, hidden, onToggle }) => {
  const { t } = useTranslation();
  return (
    <Button
      type='text'
      size='mini'
      icon={hidden ? <PreviewOpen size={12} /> : <PreviewClose size={12} />}
      aria-label={hidden ? t('metrics.charts.showChart') : t('metrics.charts.hideChart')}
      title={hidden ? t('metrics.charts.showChart') : t('metrics.charts.hideChart')}
      onClick={() => onToggle(chartKey)}
      className='text-t-tertiary hover:text-t-secondary'
    />
  );
};

type Props = {
  /** The four chart series to display. */
  history: MetricsHistory;
  /** Whether the panel is visible. */
  visible: boolean;
  /** Called when the user requests to hide the panel. */
  onRequestHide: () => void;
};

/**
 * Slide-up metrics panel with two tabs (Usage / Peers), each showing two small
 * bar charts side by side.
 *
 * Features:
 * - Vertically resizable via a drag handle on the top edge (pointer capture).
 * - Per-chart show/hide toggles.
 * - Panel height persisted to localStorage.
 */
const MetricsPanel: React.FC<Props> = ({ history, visible, onRequestHide }) => {
  const { t } = useTranslation();
  const [height, setHeight] = useState<number>(readPersistedHeight);
  const [hiddenCharts, setHiddenCharts] = useState<HiddenCharts>(new Set());
  const handleRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------
  // Vertical resize — self-contained, does NOT reuse useResizableSplit
  // (which is horizontal/clientX only).
  // ------------------------------------------------------------------
  const dragStartY = useRef<number>(0);
  const dragStartH = useRef<number>(DEFAULT_HEIGHT);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStartY.current = e.clientY;
      dragStartH.current = height;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [height]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
    // Dragging upward (negative delta) increases panel height
    const delta = dragStartY.current - e.clientY;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta));
    setHeight(next);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    const delta = dragStartY.current - e.clientY;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta));
    persistHeight(next);
  }, []);

  // ------------------------------------------------------------------
  // Per-chart toggle
  // ------------------------------------------------------------------
  const toggleChart = useCallback((key: string) => {
    setHiddenCharts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (!visible) return null;

  // Helper: render a chart slot (visible or collapsed)
  const renderChartSlot = (key: string, title: string, series: ChartSeries) => {
    const hidden = hiddenCharts.has(key);
    return (
      <div key={key} className='flex-1 min-w-0 flex flex-col gap-4px'>
        <div className='flex items-center justify-between gap-4px'>
          {hidden ? <span className='text-11px text-t-tertiary truncate'>{title}</span> : null}
          <ChartToggleButton chartKey={key} hidden={hidden} onToggle={toggleChart} />
        </div>
        {!hidden && <BarChart series={series} title={title} />}
      </div>
    );
  };

  return (
    <div
      className='flex flex-col bg-bg-2 border-t border-line-2 select-none'
      style={{ height: `${height}px`, minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
    >
      {/* Resize handle — top edge, row-resize cursor */}
      <div
        ref={handleRef}
        className='w-full h-6px cursor-row-resize flex items-center justify-center group shrink-0'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label='Resize metrics panel'
      >
        <div className='h-2px w-32px rd-full bg-fill-3 group-hover:bg-aou-6 transition-colors duration-150' />
      </div>

      {/* Panel header */}
      <div className='flex items-center justify-between px-12px pb-0 shrink-0'>
        <span className='text-12px font-medium text-t-secondary leading-none'>{t('metrics.panel.title')}</span>
        <Button
          type='text'
          size='mini'
          icon={<Close size={12} />}
          aria-label={t('metrics.panel.hide')}
          onClick={onRequestHide}
          className='text-t-tertiary hover:text-t-secondary'
        />
      </div>

      {/* Tabs */}
      <div className='flex-1 min-h-0 overflow-hidden px-12px pb-8px'>
        <Tabs defaultActiveTab='usage' size='small' className='h-full'>
          <TabPane key='usage' title={t('metrics.tabs.usage')}>
            <div className='flex flex-row gap-12px pt-8px h-full'>
              {renderChartSlot('sessionUsage', t('metrics.charts.sessionUsage'), history.sessionUsage)}
              {renderChartSlot('weeklyUsage', t('metrics.charts.weeklyUsage'), history.weeklyUsage)}
            </div>
          </TabPane>
          <TabPane key='peers' title={t('metrics.tabs.peers')}>
            <div className='flex flex-row gap-12px pt-8px h-full'>
              {renderChartSlot('openPeersWeek', t('metrics.charts.openPeersWeek'), history.openPeersWeek)}
              {renderChartSlot('activePeers5min', t('metrics.charts.activePeers5min'), history.activePeers5min)}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default MetricsPanel;
