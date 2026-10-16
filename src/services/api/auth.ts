import axios from 'axios'
import { queryOptions } from '@tanstack/react-query'
import { getSessionToken, setSessionToken } from '@/lib/session'
import { queryClient } from '@/app/providers/query-client'
import { api, ApiError } from '@/services/api/client'
import type { LoginRequest, RegisterRequest, SessionResponse } from '@/types/marketplace'
import { newerResource } from '@/lib/resource-versions'

export const sessionKey = (token: string | null) => ['session', token] as const
function sessionResponse(value: unknown): SessionResponse {
  if (!value || typeof value !== 'object' || !('token' in value) || typeof value.token !== 'string' || !value.token || !('expiresAt' in value) || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || !('user' in value) || !value.user || typeof value.user !== 'object' || !('id' in value.user) || typeof value.user.id !== 'string' || !('username' in value.user) || typeof value.user.username !== 'string' || !('email' in value.user) || typeof value.user.email !== 'string' || !('displayName' in value.user) || typeof value.user.displayName !== 'string') throw new ApiError('A API retornou uma sessão inválida. Tente novamente.', 502, 'INVALID_SESSION_RESPONSE')
  return value as SessionResponse
}
async function authenticate(path: string, input: LoginRequest | RegisterRequest, signal?: AbortSignal) {
  const previous = getSessionToken()
  const response = await api.post<unknown>(path, input, { signal })
  if (signal?.aborted || previous !== getSessionToken()) throw new axios.CanceledError('A tentativa de autenticação foi cancelada.')
  const data = sessionResponse(response.data)
  queryClient.setQueryData(sessionKey(data.token), data)
  setSessionToken(data.token)
  return data
}
export const sessionQuery = (token: string | null) => queryOptions({
  queryKey: sessionKey(token), enabled: !!token,
  structuralSharing: (before, next) => {
    const previous = before as SessionResponse | undefined
    const incoming = next as SessionResponse
    return { ...incoming, user: newerResource(previous?.user, incoming.user) }
  },
  queryFn: async ({ signal }) => {
    const data = sessionResponse((await api.get<unknown>('/session', { signal, headers: { Authorization: `Bearer ${token}` } })).data)
    if (data.token !== token) throw new ApiError('A API retornou outra sessão.', 502, 'INVALID_SESSION_RESPONSE')
    return data
  },
  staleTime: 15_000, retry: false, refetchOnWindowFocus: 'always', refetchInterval: 30_000,
})

export const authApi = {
  login: (input: LoginRequest, signal?: AbortSignal) => authenticate('/session', input, signal),
  register: (input: RegisterRequest, signal?: AbortSignal) => authenticate('/accounts', input, signal),
  async session(signal?: AbortSignal) { return sessionResponse((await api.get<unknown>('/session', { signal })).data) },
  async logout() {
    const token = getSessionToken()
    try {
      if (token) {
        const response = await api.delete('/session', { headers: { Authorization: `Bearer ${token}` } })
        if (response.status !== 204) throw new ApiError('A API não confirmou a revogação da sessão.', 502, 'INVALID_LOGOUT_RESPONSE')
      }
      if (getSessionToken() === token || !getSessionToken()) setSessionToken(null, 'logout')
    } catch (error) {
      if (getSessionToken() === token || !getSessionToken()) setSessionToken(null, error instanceof ApiError && error.status === 401 ? 'logout' : 'logout-failed')
      throw error
    }
  },
}
