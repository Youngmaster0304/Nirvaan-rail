import React, { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout, PrivateRoute } from './layouts/AppLayout';
import { useAuthStore } from './store/authStore';
import { LoadingSpinner } from './components/LoadingSpinner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TaskPrioritizationPage = lazy(() => import('./pages/TaskPrioritizationPage'));
const BlockPlanningPage = lazy(() => import('./pages/BlockPlanningPage'));
const WeeklyPlanPage = lazy(() => import('./pages/WeeklyPlanPage'));
const MonthlyPlanPage = lazy(() => import('./pages/MonthlyPlanPage'));
const CorridorMapPage = lazy(() => import('./pages/CorridorMapPage'));
const ImpactSimulationPage = lazy(() => import('./pages/ImpactSimulationPage'));
const AuditTrailPage = lazy(() => import('./pages/AuditTrailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const ContactPage = lazy(() => import('./pages/legal/ContactPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const RtiPage = lazy(() => import('./pages/legal/RtiPage'));
const SitemapPage = lazy(() => import('./pages/legal/SitemapPage'));

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <React.Suspense fallback={<LoadingSpinner message="Opening console" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* statutory pages stay readable without a session */}
        <Route element={<AppLayout />}>
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/rti" element={<RtiPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TaskPrioritizationPage />} />
            <Route path="/block-planning" element={<BlockPlanningPage />} />
            <Route path="/weekly" element={<WeeklyPlanPage />} />
            <Route path="/monthly" element={<MonthlyPlanPage />} />
            <Route path="/corridor-map" element={<CorridorMapPage />} />
            <Route path="/simulation" element={<ImpactSimulationPage />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>
        </Route>

        {/* legacy URLs kept bookmarkable */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/weekly-plans" element={<Navigate to="/weekly" replace />} />
        <Route path="/monthly-plans" element={<Navigate to="/monthly" replace />} />
        <Route path="/blocks" element={<Navigate to="/block-planning" replace />} />
        <Route path="/map" element={<Navigate to="/corridor-map" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}
