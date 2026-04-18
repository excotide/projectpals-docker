export interface LaravelApiResponse<TData> {
  data: TData
  message?: string
  errors?: Record<string, string[]>
  success?: boolean
}

export interface ApiRequestOptions extends Omit<RequestInit, 'method' | 'body' | 'headers'> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  auth?: boolean
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const BASE_API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const API_PREFIX = normalizeApiPrefix(import.meta.env.VITE_API_PREFIX)

function normalizeApiPrefix(value: string | undefined): string {
  const raw = (value ?? '/api').trim()
  const normalized = raw.replace(/^\/+|\/+$/g, '')
  return normalized.length > 0 ? `/${normalized}` : ''
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!API_PREFIX) {
    return `${BASE_API_URL}${normalizedPath}`
  }

  const isAlreadyPrefixed =
    normalizedPath === API_PREFIX || normalizedPath.startsWith(`${API_PREFIX}/`)

  const apiPath = isAlreadyPrefixed ? normalizedPath : `${API_PREFIX}${normalizedPath}`

  return `${BASE_API_URL}${apiPath}`
}

function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem('token')
}

function createHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers)
  const hasBody = options.body !== undefined && options.body !== null
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  headers.set('Accept', 'application/json')

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if ((options.auth ?? true) && !headers.has('Authorization')) {
    const token = getTokenFromStorage()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return headers
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<LaravelApiResponse<TData>> {
  if (!BASE_API_URL) {
    throw new Error('VITE_API_URL is not configured')
  }

  const method = options.method ?? 'GET'
  const headers = createHeaders(options)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const response = await fetch(buildUrl(path), {
    ...options,
    method,
    headers,
    body:
      options.body === undefined || options.body === null
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  })

  const payload = (await response.json().catch(() => ({}))) as unknown

  if (!response.ok) {
    const defaultMessage =
      typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Request failed'

    throw new ApiError(defaultMessage, response.status, payload)
  }

  if (typeof payload === 'object' && payload !== null) {
    const payloadRecord = payload as Record<string, unknown>
    const hasWrappedData = Object.prototype.hasOwnProperty.call(payloadRecord, 'data')

    return {
      data: (hasWrappedData ? payloadRecord.data : payload) as TData,
      message: typeof payloadRecord.message === 'string' ? payloadRecord.message : undefined,
      errors:
        typeof payloadRecord.errors === 'object' && payloadRecord.errors !== null
          ? (payloadRecord.errors as Record<string, string[]>)
          : undefined,
      success: typeof payloadRecord.success === 'boolean' ? payloadRecord.success : undefined,
    }
  }

  return {
    data: payload as TData,
  }
}

export function apiGet<TData>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
  return apiRequest<TData>(path, { ...options, method: 'GET' })
}

export function apiPost<TData>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
) {
  return apiRequest<TData>(path, {
    ...options,
    method: 'POST',
    body,
  })
}

export function apiPatch<TData>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
) {
  return apiRequest<TData>(path, {
    ...options,
    method: 'PATCH',
    body,
  })
}

export function apiDelete<TData>(
  path: string,
  options: Omit<ApiRequestOptions, 'method'> = {},
) {
  return apiRequest<TData>(path, {
    ...options,
    method: 'DELETE',
  })
}
