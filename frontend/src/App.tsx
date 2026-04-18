import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import AuthPage from "./pages/AuthPage"
import CreateRoom from "./pages/CreateRoom"
import JoinRoom from "./pages/JoinRoom"
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import RoomDetail from "./pages/RoomDetail"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminPanel from "./pages/admin/AdminPanel"
import AdminRoute from "./components/admin/AdminRoute"
import { AdminAuthProvider } from "./hooks/useAdminAuth"
import { ADMIN_PREFIX } from "./lib/adminApi"

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token")

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const adminBasePath = `/${ADMIN_PREFIX}`

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={(
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          )}
        />
        <Route
          path="/create-room"
          element={(
            <RequireAuth>
              <CreateRoom />
            </RequireAuth>
          )}
        />
        <Route
          path="/join-room"
          element={(
            <RequireAuth>
              <JoinRoom />
            </RequireAuth>
          )}
        />
        <Route
          path="/rooms/:roomCode"
          element={(
            <RequireAuth>
              <RoomDetail />
            </RequireAuth>
          )}
        />
        <Route
          path={`${adminBasePath}/login`}
          element={(
            <AdminAuthProvider>
              <AdminLogin />
            </AdminAuthProvider>
          )}
        />
        <Route
          path={`${adminBasePath}/*`}
          element={(
            <AdminAuthProvider>
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            </AdminAuthProvider>
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}