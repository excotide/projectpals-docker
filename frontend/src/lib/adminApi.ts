import axios from "axios"

function normalizePrefix(value: string | undefined): string {
  const fallback = "pp-console"
  const raw = (value ?? fallback).trim()
  return raw.replace(/^\/+|\/+$/g, "") || fallback
}

const API_ROOT = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "")
export const ADMIN_PREFIX = normalizePrefix(import.meta.env.VITE_ADMIN_PREFIX)

export const adminApi = axios.create({
  baseURL: `${API_ROOT}/api/${ADMIN_PREFIX}`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
})

export async function initCsrf(): Promise<void> {
  await axios.get(`${API_ROOT}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: "application/json",
    },
  })
}

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const expired = error?.response?.data?.expired === true

    if (status === 401 && expired) {
      const path = `/${ADMIN_PREFIX}/login?reason=expired`
      if (window.location.pathname + window.location.search !== path) {
        window.location.assign(path)
      }
    }

    return Promise.reject(error)
  },
)
