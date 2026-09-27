import React, { Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { GovtHeader } from '../components/GovtHeader';
import { GovtNavbar } from '../components/GovtNavbar';
import { GovtFooter } from '../components/GovtFooter';
import { ChatbotWidget } from '../components/ChatbotWidget';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

/**
 * Guards a route until the persisted session has been checked, then renders
 * the standard government console shell around the page.
 */
export const PrivateRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Restoring session" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children ?? <Outlet />}</>;
};

export const AppLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
    <GovtHeader />
    <GovtNavbar />
    <main id="main-content" className="flex-1 w-full">
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </main>
    <GovtFooter />
    <ChatbotWidget />
  </div>
);
