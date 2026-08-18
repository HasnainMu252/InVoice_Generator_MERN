import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AdminRoute } from "@/components/AdminRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";

/*
 * Every screen past the login wall is code-split. Recharts (Dashboard, Reports)
 * and jsPDF (invoice/report exports) are the two heavyweight dependencies —
 * splitting them keeps the initial download to the shell plus the login screen
 * instead of shipping the whole app up front.
 */
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
const NewInvoicePage = lazy(() => import("@/pages/NewInvoicePage"));
const InvoiceDetailPage = lazy(() => import("@/pages/InvoiceDetailPage"));
const EditInvoicePage = lazy(() => import("@/pages/EditInvoicePage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const NewOrderPage = lazy(() => import("@/pages/NewOrderPage"));
const EditOrderPage = lazy(() => import("@/pages/EditOrderPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Orders and invoices change rarely within a session; serving them from
      // cache avoids a refetch on every navigation.
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Everything below requires a verified session. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/new" element={<NewInvoicePage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/invoices/:id/edit" element={<EditInvoicePage />} />

                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/new" element={<NewOrderPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/orders/:id/edit" element={<EditOrderPage />} />

                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Administrators only. */}
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
