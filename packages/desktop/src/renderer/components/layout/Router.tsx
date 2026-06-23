import React, { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLoader from '@renderer/components/layout/AppLoader';
import RouteErrorBoundary from '@renderer/components/layout/RouteErrorBoundary';
import { useAuth } from '@renderer/hooks/context/AuthContext';
import { TEAM_MODE_ENABLED } from '@/common/config/constants';
const Conversation = React.lazy(() => import('@renderer/pages/conversation'));
const Guid = React.lazy(() => import('@renderer/pages/guid'));
const AgentSettings = React.lazy(() => import('@renderer/pages/settings/AgentSettings'));
const AppearanceSettings = React.lazy(() => import('@renderer/pages/settings/AppearanceSettings'));
const ModeSettings = React.lazy(() => import('@renderer/pages/settings/ModeSettings'));
const SystemSettings = React.lazy(() => import('@renderer/pages/settings/SystemSettings'));
const ExtensionSettingsPage = React.lazy(() => import('@renderer/pages/settings/ExtensionSettingsPage'));
const LoginPage = React.lazy(() => import('@renderer/pages/login'));
const ComponentsShowcase = React.lazy(() => import('@renderer/pages/TestShowcase'));
const ScheduledTasksPage = React.lazy(() => import('@renderer/pages/cron/ScheduledTasksPage'));
const TaskDetailPage = React.lazy(() => import('@renderer/pages/cron/ScheduledTasksPage/TaskDetailPage'));
const TeamIndex = React.lazy(() => import('@renderer/pages/team'));

// ADR-0004: every lazy route is wrapped in a RouteErrorBoundary here, so a
// render throw in any one route degrades to a recoverable fallback instead of
// white-screening the whole app. Add new routes through this helper to keep the
// "every route is wrapped" convention — a route mounted outside it loses the net.
const withRouteFallback = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <RouteErrorBoundary>
    <Suspense fallback={<AppLoader />}>
      <Component />
    </Suspense>
  </RouteErrorBoundary>
);

const ProtectedLayout: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AppLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to='/login' replace />;
  }

  return React.cloneElement(layout);
};

const PanelRoute: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route
          path='/login'
          element={status === 'authenticated' ? <Navigate to='/guid' replace /> : withRouteFallback(LoginPage)}
        />
        <Route element={<ProtectedLayout layout={layout} />}>
          <Route index element={<Navigate to='/guid' replace />} />
          <Route path='/guid' element={withRouteFallback(Guid)} />
          <Route path='/conversation/:id' element={withRouteFallback(Conversation)} />
          <Route
            path='/team/:id'
            element={TEAM_MODE_ENABLED ? withRouteFallback(TeamIndex) : <Navigate to='/guid' replace />}
          />
          <Route path='/settings/model' element={withRouteFallback(ModeSettings)} />
          <Route path='/settings/agent' element={withRouteFallback(AgentSettings)} />
          <Route path='/settings/appearance' element={withRouteFallback(AppearanceSettings)} />
          <Route path='/settings/display' element={<Navigate to='/settings/appearance' replace />} />
          <Route path='/settings/system' element={withRouteFallback(SystemSettings)} />
          <Route path='/settings/ext/:tabId' element={withRouteFallback(ExtensionSettingsPage)} />
          <Route path='/settings' element={<Navigate to='/settings/model' replace />} />
          <Route path='/test/components' element={withRouteFallback(ComponentsShowcase)} />
          <Route path='/scheduled' element={withRouteFallback(ScheduledTasksPage)} />
          <Route path='/scheduled/:job_id' element={withRouteFallback(TaskDetailPage)} />
        </Route>
        <Route path='*' element={<Navigate to={status === 'authenticated' ? '/guid' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  );
};

export default PanelRoute;
