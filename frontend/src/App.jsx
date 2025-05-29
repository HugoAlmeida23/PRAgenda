import React from "react"; // Corrected import
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
import OrganizationManagement from "./pages/OrganizationManagement";
import TaskWorkflow from "./pages/TaskOverflow"; // Assuming TaskOverflow is correct, or TaskWorkflow
import WorkflowManagement from "./pages/WorkflowManagement";
import DashboardRouter from "./pages/DashboardRouter"; // This will likely be your HomePage equivalent
import { PermissionsProvider } from './contexts/PermissionsContext';
import Layout from './components/Layout/Layout'; // Your new Layout component

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
  // It's good practice to also inform any global state/context about logout
  // For example, if PermissionsProvider has a logout function:
  // const { logout } = usePermissions(); logout();
  return <Navigate to="/login" />;
}

function RegisterAndLogout() {
  localStorage.clear();
  // Similar to Logout, inform global state if necessary
  return <Register />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider> {/* PermissionsProvider should wrap BrowserRouter or be accessible to ProtectedRoute */}
        <BrowserRouter>
          <Routes>
            {/* Routes that DO NOT use the Layout (e.g., login, register, logout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<RegisterAndLogout />} />

            {/* Protected routes that WILL use the Layout component */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout /> 
                </ProtectedRoute>
              }
            >
              {/* Child routes of Layout. These will be rendered in Layout's <Outlet /> */}
              <Route index element={<DashboardRouter />} /> {/* Default page for "/", often the dashboard */}
              <Route path="profile" element={<Profile />} />
              <Route path="clients" element={<ClientManagement />} />
              <Route path="timeentry" element={<TimeEntry />} />
              <Route path="clientprofitability" element={<ClientProfitability />} />
              <Route path="tasks" element={<TaskManagement />} />
              <Route path="organization" element={<OrganizationManagement />} />
              <Route path="task-workflow/:taskId" element={<TaskWorkflow />} />
              <Route path="workflow-management" element={<WorkflowManagement />} />
            </Route>

            {/* Fallback for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </PermissionsProvider>
    </QueryClientProvider>
  );
}

export default App;