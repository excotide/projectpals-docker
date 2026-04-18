import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAdminAuth } from "../../hooks/useAdminAuth"
import { ADMIN_PREFIX } from "../../lib/adminApi"

export default function AdminRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isChecked, isLoggedIn } = useAdminAuth()

  if (!isChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0D1117",
        display: "grid",
        placeItems: "center",
      }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: "999px",
          border: "3px solid rgba(47,128,237,0.25)",
          borderTopColor: "#2F80ED",
          animation: "admin-spin 0.8s linear infinite",
        }} />
        <style>{"@keyframes admin-spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/${ADMIN_PREFIX}/login`}
        state={{ from: location }}
        replace
      />
    )
  }

  return <>{children}</>
}
