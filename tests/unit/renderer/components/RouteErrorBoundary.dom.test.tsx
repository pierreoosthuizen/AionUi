/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ADR-0004: per-route error boundaries. A render throw in any route must
// degrade to a recoverable fallback instead of white-screening the whole app.
// jsdom can't reproduce Arco's real null-ref throw (it only warns), so per the
// ADR testability note these tests use a synthetic always-throwing child and
// assert the fallback renders — they prove the boundary logic, not Arco fidelity.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import RouteErrorBoundary from '@/renderer/components/layout/RouteErrorBoundary';

const Boom: React.FC<{ throwNow: boolean }> = ({ throwNow }) => {
  if (throwNow) throw new Error('synthetic render throw');
  return <div>recovered child</div>;
};

describe('RouteErrorBoundary', () => {
  /** A child that renders cleanly passes straight through — no fallback. */
  it('renders children when nothing throws', () => {
    render(
      <RouteErrorBoundary>
        <div>healthy route</div>
      </RouteErrorBoundary>
    );
    expect(screen.getByText('healthy route')).toBeTruthy();
  });

  /** A child render throw is caught: fallback shows, children do NOT. */
  it('renders the fallback (not the children) when a child throws', () => {
    // Boundary logs on catch (ADR §2) — silence the expected React error noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RouteErrorBoundary>
        <Boom throwNow />
      </RouteErrorBoundary>
    );
    expect(screen.queryByText('recovered child')).toBeNull();
    expect(screen.getByText('common.routeError.title')).toBeTruthy();
    // ADR §2: throws are not silently swallowed.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  /** The recovery action resets the boundary so a now-healthy tree re-renders. */
  it('clears the error on retry so children can re-render', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Toggle controls whether the child throws; flip it before retrying.
    let throwNow = true;
    const { rerender } = render(
      <RouteErrorBoundary>
        <Boom throwNow={throwNow} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('common.routeError.title')).toBeTruthy();

    throwNow = false;
    rerender(
      <RouteErrorBoundary>
        <Boom throwNow={throwNow} />
      </RouteErrorBoundary>
    );
    // Still showing fallback until the user resets the boundary.
    fireEvent.click(screen.getByText('common.retry'));

    expect(screen.getByText('recovered child')).toBeTruthy();
    spy.mockRestore();
  });
});
