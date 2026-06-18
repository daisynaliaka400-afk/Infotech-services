import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Customer pages
import HomePage from '@/pages/HomePage';
import BundlesPage from '@/pages/BundlesPage';
import CheckoutPage from '@/pages/CheckoutPage';
import TrackOrderPage from '@/pages/TrackOrderPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Admin pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminBundlesPage from '@/pages/admin/AdminBundlesPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminLogsPage from '@/pages/admin/AdminLogsPage';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Customer routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="bundles" element={<AdminBundlesPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
          </Route>

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </Router>
  );
};

export default App;
