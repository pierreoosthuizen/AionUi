/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChartSeries } from '@/common/types/metricsPanel';
import React from 'react';

/** Virtual chart height in viewBox units (bar values map onto this). */
const VB_H = 100;
/** Fraction of each slot the bar fills (rest is inter-bar gap). */
const BAR_FILL = 0.72;
/** Minimum rendered bar height (viewBox units) so tiny values stay visible. */
const MIN_BAR_H = 2;

/**
 * CSS color for a percentage bar — mirrors PlanUsageBars thresholds:
 * >90 danger, >70 warning, else primary.
 */
const pctBarColor = (pct: number): string =>
  pct > 90 ? 'rgb(var(--danger-6))' : pct > 70 ? 'rgb(var(--warning-6))' : 'rgb(var(--primary-6))';

/** Display label for the last known value, or '—' when no data yet. */
function lastValue(series: ChartSeries): string {
  for (let i = series.bars.length - 1; i >= 0; i--) {
    const bar = series.bars[i];
    if (bar !== undefined && bar.value !== null) {
      return series.unit === 'pct' ? `${Math.round(bar.value)}%` : String(Math.round(bar.value));
    }
  }
  return '—';
}

type Props = {
  /** The fully-shaped series to render (from MetricsHistory). */
  series: ChartSeries;
  /** Chart title shown above the bars. */
  title: string;
  /** Optional control (e.g. hide toggle) rendered at the right of the header. */
  toggle?: React.ReactNode;
};

/**
 * Small presentational bar chart for the MetricsPanel.
 *
 * The SVG fills its flex container in BOTH axes (width: 100%, height: 100%,
 * `preserveAspectRatio='none'`), so the chart grows/shrinks as the panel is
 * resized. Slots where `value === null` draw a faint full-height track segment
 * so the full period length is always visible. `unit:'pct'` bars are coloured
 * by threshold; `unit:'count'` bars use the primary token.
 */
const BarChart: React.FC<Props> = ({ series, title, toggle }) => {
  const bars = series.bars;
  const barCount = bars.length;
  const currentVal = lastValue(series);
  // viewBox width = one unit per slot; horizontal scaling fills the container.
  const vbW = Math.max(1, barCount);
  const barW = BAR_FILL;

  return (
    <div className='flex flex-col gap-4px min-w-0 min-h-0 flex-1'>
      {/* Header: title + current value + optional toggle */}
      <div className='flex items-center justify-between gap-4px shrink-0'>
        <span className='text-11px text-t-secondary truncate leading-none' title={title}>
          {title}
        </span>
        <div className='flex items-center gap-4px shrink-0'>
          <span className='text-11px text-t-tertiary tabular-nums leading-none'>{currentVal}</span>
          {toggle}
        </div>
      </div>

      {/* Bars — fill the remaining slot height */}
      <div className='flex-1 min-h-0'>
        <svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${vbW} ${VB_H}`}
          preserveAspectRatio='none'
          style={{ display: 'block' }}
        >
          {barCount === 0 ? (
            <rect x={0} y={0} width={vbW} height={VB_H} fill='rgb(var(--fill-3))' opacity={0.35} />
          ) : (
            bars.map((bar, i) => {
              const x = i + (1 - barW) / 2;
              const track = (
                <rect key={`t${i}`} x={x} y={0} width={barW} height={VB_H} fill='rgb(var(--fill-3))' opacity={0.35} />
              );
              if (bar.value === null) return track;
              const ratio = series.max > 0 ? Math.min(1, Math.max(0, bar.value / series.max)) : 0;
              const h = Math.max(MIN_BAR_H, ratio * VB_H);
              const color = series.unit === 'pct' ? pctBarColor(bar.value) : 'rgb(var(--primary-6))';
              return (
                <g key={i}>
                  {track}
                  <rect x={x} y={VB_H - h} width={barW} height={h} fill={color} />
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};

export default BarChart;
