import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import AuthPage from "./pages/AuthPage"
import CreateRoom from "./pages/CreateRoom"
import JoinRoom from "./pages/JoinRoom"
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import MyRooms from "./pages/MyRooms"
import RoomDetailRouter from "./pages/RoomDetailRouter"
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
          path="/my-rooms"
          element={(
            <RequireAuth>
              <MyRooms />
            </RequireAuth>
          )}
        />
        <Route
          path="/rooms/:roomCode"
          element={(
            <RequireAuth>
              <RoomDetailRouter />
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