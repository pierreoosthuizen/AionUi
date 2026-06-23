/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Tooltip } from '@arco-design/web-react';
import { ChartHistogram } from '@icon-park/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  /** Whether the metrics panel is currently visible. */
  open: boolean;
  /** Called when the button is clicked to toggle the panel. */
  onClick: () => void;
};

/**
 * Trigger button for the slide-up metrics panel.
 * Positioned absolutely at the bottom-right of the chat column.
 */
const MetricsPanelButton: React.FC<Props> = ({ open, onClick }) => {
  const { t } = useTranslation();
  const label = open ? t('metrics.panel.hide') : t('metrics.panel.show');

  return (
    <div className='absolute bottom-12px right-16px z-30 pointer-events-none'>
      <Tooltip content={label} position='left'>
        <Button
          type={open ? 'primary' : 'secondary'}
          size='small'
          shape='circle'
          icon={<ChartHistogram size={14} />}
          aria-label={label}
          onClick={onClick}
          className='pointer-events-auto shadow-md'
        />
      </Tooltip>
    </div>
  );
};

export default MetricsPanelButton;
