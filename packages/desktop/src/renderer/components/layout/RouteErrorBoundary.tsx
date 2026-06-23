/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '@arco-design/web-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

// ADR-0004: per-route error boundary. Wrap every lazy route (via
// withRouteFallback in Router.tsx) so a render/lifecycle throw in one route
// degrades to this recoverable fallback instead of unmounting the whole tree
// (white screen). NOTE: React error boundaries catch render + lifecycle throws
// only — NOT event-handler or async/promise throws (ADR §3). This is a net, not
// a substitute for fixing the throw at its source.

type Props = { children: React.ReactNode };
type State = { error: Error | null };

const RouteErrorFallback: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const { t } = useTranslation();
  return (
    <div className='flex flex-col items-center justify-center h-full gap-12px p-24px text-center'>
      <span className='text-15px font-600 text-t-primary'>{t('common.routeError.title')}</span>
      <span className='text-13px text-t-secondary max-w-360px'>{t('common.routeError.description')}</span>
      <Button type='primary' onClick={onReset}>
        {t('common.retry')}
      </Button>
    </div>
  );
};

class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ponytail: console.error only for v1; no error-reporting telemetry. Wire to
    // a log sink if crash visibility becomes a real need. A silent boundary would
    // hide future render regressions (ADR §2) — worse than the white screen.
    console.error('[RouteErrorBoundary]', error, errorInfo);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <RouteErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
