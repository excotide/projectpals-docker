import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import AuthPage from "./pages/auth/AuthPage"
import CreateRoom from "./pages/rooms/CreateRoom"
import JoinRoom from "./pages/rooms/JoinRoom"
import LandingPage from "./pages/landing/LandingPage"
import Dashboard from "./pages/dashboard/Dashboard"
import HistoryPage from "./pages/history/HistoryPage"
import MyRooms from "./pages/rooms/MyRooms"
import RoomDetailRouter from "./pages/rooms/RoomDetailRouter"
import MatchedRoomOverview from "./pages/rooms/MatchedRoomOverview"
import ProfilePage from "./pages/profile/ProfilePage"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminPanel from "./pages/admin/AdminPanel"
import AdminRoute from "./components/admin/AdminRoute"
import { AdminAuthProvider } from "./hooks/useAdminAuth"
import { ADMIN_PREFIX } from "./lib/adminApi"
import FcmRegistrar from "./components/FcmRegistrar"

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
      <FcmRegistrar />
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
          path="/history"
          element={(
            <RequireAuth>
              <HistoryPage />
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
          path="/rooms/:roomCode/matched"
          element={(
            <RequireAuth>
              <MatchedRoomOverview />
            </RequireAuth>
          )}
        />
        <Route
          path="/profile"
          element={(
            <RequireAuth>
              <ProfilePage />
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