/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChartSeries } from '@/common/types/metricsPanel';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Height of the SVG chart area in px. */
const CHART_HEIGHT = 48;
/** Gap between bars in px. */
const BAR_GAP = 2;
/** Minimum rendered bar height for a non-null value (so tiny values stay visible). */
const MIN_BAR_HEIGHT = 2;

/**
 * Returns the CSS color string for a percentage-based bar.
 * Mirrors PlanUsageBars thresholds: >90 danger, >70 warning, else primary.
 */
const pctBarColor = (pct: number): string =>
  pct > 90 ? 'rgb(var(--danger-6))' : pct > 70 ? 'rgb(var(--warning-6))' : 'rgb(var(--primary-6))';

/** Returns the CSS color string for a count-based bar (always primary). */
const countBarColor = (): string => 'rgb(var(--primary-6))';

/**
 * Returns the display label for the current/last known value in a series.
 * Shows the last non-null value, or '—' if no data yet.
 */
function lastValue(series: ChartSeries): string {
  for (let i = series.bars.length - 1; i >= 0; i--) {
    const bar = series.bars[i];
    if (bar !== undefined && bar.value !== null) {
      if (series.unit === 'pct') return `${Math.round(bar.value)}%`;
      return String(Math.round(bar.value));
    }
  }
  return '—';
}

type Props = {
  /** The fully-shaped series to render (from MetricsHistory). */
  series: ChartSeries;
  /** Chart title shown above the bars. */
  title: string;
};

/**
 * Small presentational bar chart for the MetricsPanel.
 *
 * Renders the full window length as SVG rects. Slots where `value === null`
 * draw a faint empty-track segment so the full period length is always visible.
 * For `unit:'pct'` bars are coloured by threshold (danger/warning/primary).
 * For `unit:'count'` bars use the primary token.
 */
const BarChart: React.FC<Props> = ({ series, title }) => {
  const { t } = useTranslation();
  const currentVal = lastValue(series);

  const bars = useMemo(() => {
    const count = series.bars.length;
    if (count === 0) return [];
    return series.bars;
  }, [series.bars]);

  const barCount = bars.length;

  return (
    <div className='flex flex-col gap-4px min-w-0 flex-1'>
      {/* Header row: title + current value */}
      <div className='flex items-center justify-between gap-4px'>
        <span className='text-11px text-t-secondary truncate leading-none' title={title}>
          {title}
        </span>
        <span className='text-11px text-t-tertiary tabular-nums leading-none shrink-0'>{currentVal}</span>
      </div>

      {/* SVG bar chart */}
      <svg
        width='100%'
        height={CHART_HEIGHT}
        aria-label={t('metrics.charts.showChart')}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {barCount === 0 ? (
          /* No bars yet — draw a single faint full-width track */
          <rect x={0} y={0} width='100%' height={CHART_HEIGHT} rx={2} fill='rgb(var(--fill-3))' opacity={0.4} />
        ) : (
          /* Percent-positioned rects — each slot is 100/barCount% wide. */
          bars.map((bar, i) => {
            const slotW = 100 / barCount; // percent
            const x = i * slotW;
            const gapPct = (BAR_GAP / (barCount * 8)) * 100; // tiny gap
            const w = Math.max(0, slotW - gapPct);

            if (bar.value === null) {
              // Faint empty track segment
              return (
                <rect
                  key={i}
                  x={`${x}%`}
                  y={0}
                  width={`${w}%`}
                  height={CHART_HEIGHT}
                  rx={2}
                  fill='rgb(var(--fill-3))'
                  opacity={0.35}
                />
              );
            }

            const ratio = series.max > 0 ? Math.min(1, Math.max(0, bar.value / series.max)) : 0;
            const barH = Math.max(MIN_BAR_HEIGHT, Math.round(ratio * CHART_HEIGHT));
            const y = CHART_HEIGHT - barH;
            const color = series.unit === 'pct' ? pctBarColor(bar.value) : countBarColor();

            return (
              <g key={i}>
                {/* Faint track behind the filled bar */}
                <rect
                  x={`${x}%`}
                  y={0}
                  width={`${w}%`}
                  height={CHART_HEIGHT}
                  rx={2}
                  fill='rgb(var(--fill-3))'
                  opacity={0.35}
                />
                {/* Filled bar */}
                <rect x={`${x}%`} y={y} width={`${w}%`} height={barH} rx={2} fill={color} />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
};

export default BarChart;
