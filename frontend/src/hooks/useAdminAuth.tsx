import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { adminApi, initCsrf } from "../lib/adminApi"

export interface AdminIdentity {
  id: number
  name: string
  email?: string
  role: "super_admin" | "moderator"
}

interface LoginPayload {
  email: string
  password: string
  remember: boolean
}

interface UseAdminAuthValue {
  admin: AdminIdentity | null
  isLoggedIn: boolean
  isLoading: boolean
  isChecked: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<UseAdminAuthValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState(false)

  const checkSession = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminApi.get<{ admin: AdminIdentity }>("/me")
      setAdmin(response.data.admin)
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
      setChecked(true)
    }
  }, [])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  const login = useCallback(async ({ email, password, remember }: LoginPayload) => {
    setLoading(true)
    try {
      await initCsrf()
      const response = await adminApi.post<{ admin: AdminIdentity }>("/login", {
        email,
        password,
        remember,
      })
      setAdmin(response.data.admin)
      setChecked(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await adminApi.post("/logout")
    } catch {
      // Keep logout idempotent on the client even if session is already invalid.
    } finally {
      setAdmin(null)
      setChecked(true)
      setLoading(false)
    }
  }, [])

  const value = useMemo<UseAdminAuthValue>(() => ({
    admin,
    isLoggedIn: admin !== null,
    isLoading: loading,
    isChecked: checked,
    login,
    logout,
  }), [admin, checked, loading, login, logout])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): UseAdminAuthValue {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider")
  }

  return context
}
