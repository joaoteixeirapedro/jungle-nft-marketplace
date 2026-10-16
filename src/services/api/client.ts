import axios from 'axios'
import { env } from '@/lib/env'
import { getGuestId, getSessionToken, invalidateSession, subscribeSession } from '@/lib/session'
import type { InternalAxiosRequestConfig } from 'axios'

const privateRequests = new Map<InternalAxiosRequestConfig, { token: string | null; controller: AbortController; cleanup: () => void }>()
let observedToken = getSessionToken()
subscribeSession(() => {
  const current = getSessionToken()
  if (observedToken === current) return
  observedToken = current
  for (const [config, request] of privateRequests) if (request.token !== current) { request.controller.abort(); request.cleanup(); privateRequests.delete(config) }
})
function releaseRequest(config?: InternalAxiosRequestConfig) {
  if (!config) return
  const request = privateRequests.get(config)
  request?.cleanup()
  privateRequests.delete(config)
  return request
}

interface ErrorResponse {
  message?: string
  code?: string
  fieldErrors?: Record<string, string>
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string
  readonly fieldErrors: Record<string, string> | undefined
  readonly details: Record<string, unknown> | undefined

  constructor(message: string, status?: number, code = 'REQUEST_FAILED', fieldErrors?: Record<string, string>, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  config.headers.set('X-Guest-Id', getGuestId())
  const token = getSessionToken()
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`)
  const authorization = String(config.headers.get('Authorization') ?? '')
  const captured = authorization.startsWith('Bearer ') ? authorization.slice(7) : null
  const path = config.url?.split('?')[0] ?? ''
  const privateRequest = /^\/(?:favorites|profile|wallets|orders|quotes|cart)(?:\/|$)/.test(path) || (path === '/session' && config.method !== 'post')
  if (privateRequest && (captured || /^\/(cart|quotes)(\/|$)/.test(path))) {
    const controller = new AbortController()
    const original = config.signal
    const abort = () => controller.abort()
    if (original?.aborted || captured !== getSessionToken()) controller.abort()
    original?.addEventListener?.('abort', abort)
    config.signal = controller.signal
    privateRequests.set(config, { token: captured, controller, cleanup: () => original?.removeEventListener?.('abort', abort) })
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const request = releaseRequest(response.config)
    if (request && request.token !== getSessionToken()) return Promise.reject(new axios.CanceledError('A sessão mudou.'))
    return response
  },
  (error: unknown) => {
    const request = axios.isAxiosError(error) ? releaseRequest(error.config) : undefined
    if (axios.isCancel(error)) return Promise.reject(error)
    if (axios.isAxiosError<ErrorResponse>(error)) {
      if (request?.token && error.response?.status === 401) invalidateSession(request.token, error.response.data.code === 'SESSION_EXPIRED' ? 'expired' : 'invalid')
      return Promise.reject(new ApiError(
        error.response?.data?.message ?? (error.code === 'ECONNABORTED' ? 'Tempo de resposta excedido.' : 'Não foi possível concluir a requisição.'),
        error.response?.status,
        error.response?.data?.code ?? error.code,
        error.response?.data?.fieldErrors,
        error.response?.data?.details,
      ))
    }
    return Promise.reject(error instanceof Error ? error : new ApiError('Erro inesperado.'))
  },
)
