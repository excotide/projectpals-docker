import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useAdminAuth } from "../../hooks/useAdminAuth"
import { ADMIN_PREFIX } from "../../lib/adminApi"
import "./AdminLogin.css"

interface LoginErrorState {
  message: string
  attemptsRemaining?: number
}

function isAxiosLikeError(
  error: unknown,
): error is {
  response?: {
    status?: number
    data?: {
      message?: string
      attempts_remaining?: number
      lockout_seconds?: number
      locked?: boolean
    }
  }
} {
  if (typeof error !== "object" || error === null) {
    return false
  }

  return "response" in error
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, isLoading } = useAdminAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errorState, setErrorState] = useState<LoginErrorState | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const isExpiredSession = searchParams.get("reason") === "expired"
  const isFormDisabled = isLoading || lockoutSeconds > 0
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isFormDisabled

  useEffect(() => {
    if (lockoutSeconds <= 0) {
      return
    }

    const timerId = window.setInterval(() => {
      setLockoutSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId)
          setErrorState(null)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [lockoutSeconds])

  const lockoutLabel = useMemo(() => formatCountdown(lockoutSeconds), [lockoutSeconds])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setErrorState(null)

    try {
      await login({
        email: email.trim(),
        password,
        remember,
      })

      const stateFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(stateFrom || `/${ADMIN_PREFIX}`, { replace: true })
    } catch (error) {
      if (isAxiosLikeError(error)) {
        const status = error.response?.status
        const data = error.response?.data as {
          message?: string
          attempts_remaining?: number
          lockout_seconds?: number
          locked?: boolean
        } | undefined

        if (status === 429 || data?.locked) {
          const seconds = Math.max(1, Number(data?.lockout_seconds ?? 60))
          setLockoutSeconds(seconds)
          setErrorState({
            message: data?.message || "Too many attempts. Please wait before trying again.",
          })
          return
        }

        setErrorState({
          message: data?.message || "Unable to sign in. Please try again.",
          attemptsRemaining: typeof data?.attempts_remaining === "number" ? data.attempts_remaining : undefined,
        })

        return
      }

      setErrorState({
        message: "Unexpected error. Please try again.",
      })
    }
  }

  return (
    <div className="admin-login-root">
      <div className="admin-login-grid" />

      <main className="admin-login-main">
        <section className="admin-login-card">
          <div className="admin-login-brand">ProjectPals Console</div>
          <h1 className="admin-login-title">Admin Sign In</h1>
          <p className="admin-login-subtitle">Session-based access for authorized operators only.</p>

          {isExpiredSession && (
            <div className="admin-login-alert info">
              Your admin session has expired. Please sign in again.
            </div>
          )}

          {errorState && lockoutSeconds === 0 && (
            <div className="admin-login-alert error">
              <div>{errorState.message}</div>
              {typeof errorState.attemptsRemaining === "number" && (
                <small>Attempts remaining: {errorState.attemptsRemaining}</small>
              )}
            </div>
          )}

          {lockoutSeconds > 0 ? (
            <div className="admin-lockout-box">
              <p className="admin-lockout-title">Too many attempts</p>
              <p className="admin-lockout-time">{lockoutLabel}</p>
              <p className="admin-lockout-sub">Login form will re-enable automatically.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="admin-login-form">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@projectpals.id"
                autoComplete="email"
                disabled={isFormDisabled}
              />

              <label htmlFor="admin-password">Password</label>
              <div className="admin-password-wrap">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isFormDisabled}
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isFormDisabled}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label className="admin-remember-row" htmlFor="admin-remember">
                <input
                  id="admin-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  disabled={isFormDisabled}
                />
                <span>Remember this device</span>
              </label>

              <button type="submit" className="admin-login-submit" disabled={!canSubmit}>
                {isLoading ? (
                  <span className="admin-login-spinner" aria-hidden="true" />
                ) : null}
                <span>{isLoading ? "Signing in..." : "Sign in"}</span>
              </button>
            </form>
          )}

          <footer className="admin-login-footer">
            <span>Rate limited · Session protected</span>
            <span className="admin-login-badge">TLS 1.3</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
