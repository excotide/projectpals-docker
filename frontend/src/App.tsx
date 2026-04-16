import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import AuthPage from "./pages/AuthPage"
import CreateRoom from "./pages/CreateRoom"
import JoinRoom from "./pages/JoinRoom"
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import RoomDetail from "./pages/RoomDetail"

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("auth_token")

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
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
      </Routes>
    </BrowserRouter>
  )
}