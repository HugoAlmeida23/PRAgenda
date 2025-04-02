import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import Profile from "./pages/Profile"
import TimeEntry from "./pages/TimeEntry"
import { ToastContainer } from 'react-toastify';
import ClientManagement from "./pages/ClientManagement"
import TaskManagement from "./pages/TaskManagement"
import ClientProfitability from "./pages/ClientProfitability"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();



function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeentry"
          element={
            <ProtectedRoute>
              <TimeEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientprofitability"
          element={
            <ProtectedRoute>
              <ClientProfitability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />}></Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App