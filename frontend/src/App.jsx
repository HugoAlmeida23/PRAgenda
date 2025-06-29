import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-toastify/dist/ReactToastify.css';

// --- Context Providers ---
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ThemeProvider } from './contexts/ThemeContext';

// --- Components & Layouts ---
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from './components/Layout/Layout';
import GlobalNotifications from './components/GlobalNotifications';

// --- Page Imports ---
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import TimeEntry from "./pages/TimeEntry";
import ClientManagement from "./pages/ClientManagement";
import TaskManagement from "./pages/TaskManagement";
import ClientProfitability from "./pages/ClientProfitability";
import OrganizationRouter from "./pages/OrganizationRouter";
import TaskOverflow from "./pages/TaskOverflow";
import WorkflowManagement from "./pages/WorkflowManagement";
import DashboardRouter from "./pages/DashboardRouter";
import NotificationsPage from "./pages/NotificationsPage";
import FiscalDashboardPage from "./components/fiscal/FiscalDashboardPage";
import FiscalObligationDefinitionsPage from "./components/fiscal/FiscalObligationDefinitionsPage";
import FiscalSystemSettingsPage from "./components/fiscal/FiscalSystemSettingsPage";
import AIAdvisorPage from "./pages/AIAdvisorPage";
import NotificationDropdown from "./components/NotificationDropdown";
import WorkflowDesigner from "./pages/WorkflowDesigner";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import ReportsPage from "./pages/ReportsPage";
import SAFTManagementPage from "./pages/SAFTManagement";
import InvoiceProcessingPage from "./pages/InvoiceProcessing";
import TaskCreationModal from "./components/task/TaskCreationModal";

// --- React Query Client Configuration ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// --- Helper Components for Authentication Flow ---
function Logout() {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* === Public Routes (No Layout) === */}
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/register" element={<RegisterAndLogout />} />

              {/* === Protected Routes (Wrapped in Layout) === */}
              <Route 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* The Dashboard is the default page for the root path "/" */}
                <Route index element={<DashboardRouter />} /> 
                
                {/* All other protected pages are nested here */}
                <Route path="profile" element={<Profile />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="timeentry" element={<TimeEntry />} />
                <Route path="tasks" element={<TaskManagement />} />
                <Route path="clientprofitability" element={<ClientProfitability />} />
                <Route path="organization" element={<OrganizationRouter />} />
                <Route path="task-workflow/:taskId" element={<TaskOverflow />} />
                <Route path="workflow-management" element={<WorkflowManagement />} />
                <Route path="workflow-designer" element={<WorkflowDesigner/>} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="fiscal-dashboard" element={<FiscalDashboardPage />} />
                <Route path="fiscal-definitions" element={<FiscalObligationDefinitionsPage />} />
                <Route path="fiscal-settings" element={<FiscalSystemSettingsPage />} />
                <Route path="ai-advisor" element={<AIAdvisorPage />} />
                <Route path="notification-dropdown" element={<NotificationDropdown />} />
                <Route path="notifications-settings" element={<NotificationSettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="saft-management" element={<SAFTManagementPage/>} />
                <Route path="invoice-processing" element={<InvoiceProcessingPage />} />
              </Route>
              
              {/* Fallback for any route that doesn't match */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* 
              FIXED: Move TaskCreationModal here - inside BrowserRouter 
              but outside Routes, with proper context access 
            */}
            <TaskCreationModal />
          </BrowserRouter>
          
          {/* GlobalNotifications can stay here as it's context-aware */}
          <GlobalNotifications />
        </ThemeProvider>
      </PermissionsProvider>
    </QueryClientProvider>
  );
}

export default App;