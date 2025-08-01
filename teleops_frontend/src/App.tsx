// Main App Component for Circle-Based Multi-Tenant Platform
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";

// Contexts
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider as DarkModeProvider } from "./contexts/ThemeContext";
import { ThrottleProvider, useThrottle } from "./contexts/ThrottleContext";

// Components
import ThrottleBanner from "./components/common/ThrottleBanner";

// API Services
import { setGlobalThrottleHandler, setGlobalNotificationHandler } from "./services/api";
import { setInternalThrottleHandler, setInternalNotificationHandler } from "./services/internalApi";

// Store
import { store } from "./store";

// Layouts
import MainLayout from "./layouts/MainLayout";
import TeleopsInternalLayout from "./layouts/TeleopsInternalLayout";

// Pages (to be created)
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import SitesPage from "./pages/SitesPage";
import TasksPage from "./pages/TasksPage";
import EquipmentPage from "./pages/EquipmentPage";
import TeamsPage from "./pages/TeamsPage";
import WarehousePage from "./pages/WarehousePage";
import TransportPage from "./pages/TransportPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import InternalDashboardPage from "./pages/InternalDashboardPage";
import InternalTenantManagementPage from "./pages/InternalTenantManagementPage";
import TenantDetailsPage from "./pages/TenantDetailsPage";
import InternalBillingPage from "./pages/InternalBillingPage";
import InternalPlansPage from "./pages/InternalPlansPage";
import InternalSupportPage from "./pages/InternalSupportPage";
import InternalAnalyticsPage from "./pages/InternalAnalyticsPage";
import InternalVendorManagementPage from "./pages/InternalVendorManagementPage";
import OnboardingPage from "./pages/OnboardingPage";
import OnboardingStatusPage from "./pages/OnboardingStatusPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import RaiseTicketPage from "./pages/RaiseTicketPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import InternalLoginPage from "./pages/InternalLoginPage";
import ComplianceCenterPage from "./pages/ComplianceCenterPage";

// Corporate tenant portal pages
import CircleManagementPage from "./pages/CircleManagementPage";
import VendorOversightPage from "./pages/VendorOversightPage";
import GovernancePage from "./pages/GovernancePage";
import VendorManagementPage from "./pages/VendorManagementPage";
import UserManagementPage from "./pages/CircleUserManagementPage";
import OperationsManagementPage from "./pages/VendorOperationsManagementPage";
import ClientManagementPage from "./pages/ClientManagementPage";

// RBAC Management Pages
import RBACDashboardPage from "./pages/RBACDashboardPage";
import PermissionRegistryPage from "./pages/PermissionRegistryPage";
import PermissionGroupsPage from "./pages/PermissionGroupsPage";
import MyPermissionsPage from "./pages/MyPermissionsPage";
import DesignationManagementPage from "./pages/DesignationManagementPage";
import PermissionCategoriesPage from "./pages/PermissionCategoriesPage";
import PermissionDashboardPage from "./pages/PermissionDashboardPage";
import PermissionAssignmentPanel from "./pages/PermissionAssignmentPanel";
import ComprehensivePermissionDashboard from "./pages/ComprehensivePermissionDashboard";
import RBACDocumentationPage from "./pages/RBACDocumentationPage";

import { createModernTheme } from "./styles/theme";
import { useDarkMode } from "./contexts/ThemeContext";

// Dynamic theme provider component
const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { darkMode } = useDarkMode();
  const theme = createModernTheme(darkMode ? "dark" : "light");

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isAuthChecking, isTeleopsAdmin } = useAuth();

  // Show loading spinner while checking authentication
  if (isAuthChecking) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Only redirect to login if authentication check is complete and user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If Teleops admin, redirect to internal dashboard
  if (isTeleopsAdmin() && window.location.pathname !== "/internal/dashboard") {
    return <Navigate to="/internal/dashboard" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const InternalProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInternalAuthenticated, isAuthChecking } = useAuth();

  // Show loading spinner while checking authentication
  if (isAuthChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Only redirect to internal login if authentication check is complete and user is not authenticated
  if (!isInternalAuthenticated) {
    return <Navigate to="/internal/login" replace />;
  }
  return <TeleopsInternalLayout>{children}</TeleopsInternalLayout>;
};

// App Inner component to access throttle context
const AppInner: React.FC = () => {
  const { setThrottleWait } = useThrottle();

  // Set up global handlers on app startup
  useEffect(() => {
    // Set global throttle handler
    const throttleHandler = (waitSeconds: number) => {
      setThrottleWait(waitSeconds);
    };

    const notificationHandler = (message: string, severity: "error" | "warning" | "info" | "success") => {
      console.log(`[${severity.toUpperCase()}] ${message}`);
      // TODO: Connect to your global notification/snackbar system here
    };

    // Set handlers for both main API and internal API
    setGlobalThrottleHandler(throttleHandler);
    setGlobalNotificationHandler(notificationHandler);
    setInternalThrottleHandler(throttleHandler);
    setInternalNotificationHandler(notificationHandler);
  }, [setThrottleWait]);

  return (
    <>
      <ThrottleBanner />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/corporate-onboarding" element={<OnboardingPage />} />
        {/* Primary invitation route - matches API structure */}
        <Route path="/public/invitations/:token" element={<OnboardingPage />} />
        {/* Legacy route for backward compatibility */}
        <Route path="/onboarding/:token" element={<OnboardingPage />} />
        <Route path="/onboarding/status/:invitation_id" element={<OnboardingStatusPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/internal/login" element={<InternalLoginPage />} />

        {/* Teleops Internal Portal routes (superuser only) */}
        <Route
          path="/internal/dashboard"
          element={
            <InternalProtectedRoute>
              <InternalDashboardPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/tenants"
          element={
            <InternalProtectedRoute>
              <InternalTenantManagementPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/tenants/:tenantId"
          element={
            <InternalProtectedRoute>
              <TenantDetailsPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/billing"
          element={
            <InternalProtectedRoute>
              <InternalBillingPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/plans"
          element={
            <InternalProtectedRoute>
              <InternalPlansPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/support"
          element={
            <InternalProtectedRoute>
              <InternalSupportPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/analytics"
          element={
            <InternalProtectedRoute>
              <InternalAnalyticsPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/vendors"
          element={
            <InternalProtectedRoute>
              <InternalVendorManagementPage />
            </InternalProtectedRoute>
          }
        />
        <Route
          path="/internal/profile"
          element={
            <InternalProtectedRoute>
              <ProfilePage />
            </InternalProtectedRoute>
          }
        />

        {/* Protected routes for regular users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sites"
          element={
            <ProtectedRoute>
              <SitesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/equipment"
          element={
            <ProtectedRoute>
              <EquipmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse"
          element={
            <ProtectedRoute>
              <WarehousePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transport"
          element={
            <ProtectedRoute>
              <TransportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compliance-center"
          element={
            <ProtectedRoute>
              <ComplianceCenterPage />
            </ProtectedRoute>
          }
        />

        {/* Corporate tenant portal routes */}
        <Route
          path="/circles"
          element={
            <ProtectedRoute>
              <CircleManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute>
              <VendorManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedRoute>
              <OperationsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-oversight"
          element={
            <ProtectedRoute>
              <VendorOversightPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/governance"
          element={
            <ProtectedRoute>
              <GovernancePage />
            </ProtectedRoute>
          }
        />

        {/* RBAC Management Routes */}
        <Route
          path="/rbac"
          element={
            <ProtectedRoute>
              <RBACDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/dashboard"
          element={
            <ProtectedRoute>
              <RBACDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/permissions"
          element={
            <ProtectedRoute>
              <PermissionRegistryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/groups"
          element={
            <ProtectedRoute>
              <PermissionGroupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/categories"
          element={
            <ProtectedRoute>
              <PermissionCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/comprehensive-dashboard"
          element={
            <ProtectedRoute>
              <ComprehensivePermissionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-permissions"
          element={
            <ProtectedRoute>
              <MyPermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/designations"
          element={
            <ProtectedRoute>
              <DesignationManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/designations"
          element={
            <ProtectedRoute>
              <DesignationManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/permission-dashboard"
          element={
            <ProtectedRoute>
              <PermissionDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac/assignment-panel"
          element={
            <ProtectedRoute>
              <PermissionAssignmentPanel />
            </ProtectedRoute>
          }
        />

        <Route path="/support" element={<RaiseTicketPage />} />

        {/* RBAC Documentation */}
        <Route path="/rbac-doc" element={<RBACDocumentationPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

// App component
const App: React.FC = () => {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <DarkModeProvider>
          <DynamicThemeProvider>
            <CssBaseline />
            <Router>
              <AuthProvider>
                <ThrottleProvider>
                  <AppInner />
                </ThrottleProvider>
              </AuthProvider>
            </Router>
          </DynamicThemeProvider>
        </DarkModeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
};

export default App;
