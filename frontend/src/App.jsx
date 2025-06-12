import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import TimeEntry from "./pages/TimeEntry";
import { ToastContainer } from 'react-toastify';
import ClientManagement from "./pages/ClientManagement";
import TaskManagement from "./pages/TaskManagement";
import ClientProfitability from "./pages/ClientProfitability";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrganizationRouter from "./pages/OrganizationRouter";
import TaskOverflow from "./pages/TaskOverflow";
import WorkflowManagement from "./pages/WorkflowManagement";
import DashboardRouter from "./pages/DashboardRouter";
import { PermissionsProvider } from './contexts/PermissionsContext';
import Layout from './components/Layout/Layout'; // O nosso novo Layout
import NotificationsPage from "./pages/NotificationsPage";
import FiscalDashboardPage from "./components/fiscal/FiscalDashboardPage";
import FiscalObligationDefinitionsPage from "./components/fiscal/FiscalObligationDefinitionsPage";
import FiscalSystemSettingsPage from "./components/fiscal/FiscalSystemSettingsPage";
import AIAdvisorPage from "./pages/AIAdvisorPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
        <BrowserRouter>
          <ToastContainer theme="dark" position="bottom-right" />
          <Routes>
            {/* Rotas que NÃO usam o Layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<RegisterAndLogout />} />

            {/* Rotas Protegidas que usam o novo Layout */}
            <Route
              path="/*" // Usar um wildcard para apanhar todas as outras rotas
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* As rotas filhas são agora definidas aqui, dentro do Outlet do Layout */}
                      <Route index element={<DashboardRouter />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="clients" element={<ClientManagement />} />
                      <Route path="timeentry" element={<TimeEntry />} />
                      <Route path="tasks" element={<TaskManagement />} />
                      <Route path="clientprofitability" element={<ClientProfitability />} />
                      <Route path="organization" element={<OrganizationRouter />} />
                      <Route path="task-workflow/:taskId" element={<TaskOverflow />} />
                      <Route path="workflow-management" element={<WorkflowManagement />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="fiscal-dashboard" element={<FiscalDashboardPage />} />
                      <Route path="fiscal-definitions" element={<FiscalObligationDefinitionsPage />} />
                      <Route path="fiscal-settings" element={<FiscalSystemSettingsPage />} />
                      <Route path="ai-advisor" element={<AIAdvisorPage />} />
                      {/* Fallback para rotas desconhecidas dentro da área protegida */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </QueryClientProvider>
  );
}

export default App;