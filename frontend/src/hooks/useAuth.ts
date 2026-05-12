import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../lib/api'

export interface AuthUser {
  id: number | string
  name: string
  email: string
  [key: string]: unknown
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: AuthUser
}

export interface RegisterPayload {
  name: string
  username: string
  email: string
  password: string
  password_confirmation: string
  device_name?: string
}

const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem('token')
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async () => {
      const response = await apiGet<AuthUser>('/auth/me')
      return response.data
    },
    enabled: Boolean(getStoredToken()),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await apiPost<LoginResult>('/auth/login', payload, { auth: false })
      return response.data
    },
    onSuccess: async (data) => {
      window.localStorage.setItem('token', data.token)
      await queryClient.invalidateQueries({ queryKey: authKeys.currentUser() })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await apiPost<LoginResult>('/auth/register', payload, { auth: false })
      return response.data
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiPost<null>('/auth/logout', {})
    },
    onSuccess: async () => {
      window.localStorage.removeItem('token')
      await queryClient.invalidateQueries({ queryKey: authKeys.all })
    },
  })
}

export { authKeys }
