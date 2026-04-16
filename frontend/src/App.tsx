import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import AuthPage from "./pages/AuthPage"
import CreateRoom from "./pages/CreateRoom"
import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"

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
      </Routes>
    </BrowserRouter>
  )
}