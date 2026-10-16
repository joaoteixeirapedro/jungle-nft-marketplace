import { useEffect, type PropsWithChildren } from 'react'
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthContext, type AuthState } from './auth-context'
import { useSessionToken } from '@/hooks/use-session-token'
import { getSessionToken, invalidateSession, subscribeSession } from '@/lib/session'
import { sessionQuery } from '@/services/api/auth'

const privateResources = new Set(['session', 'favorites', 'profile', 'wallets', 'orders', 'order', 'receipt', 'quote', 'quotes', 'cart', 'logout'])
export function AuthProvider({ children }: PropsWithChildren) {
  const token = useSessionToken()
  const client = useQueryClient()
  const query = useQuery(sessionQuery(token))
  const signingOut = useIsMutating({ mutationKey: ['logout'] }) > 0
  useEffect(() => {
    const cleanup = () => {
      const current = getSessionToken()
      const stale = (key: readonly unknown[]) => typeof key[0] === 'string' && privateResources.has(key[0]) && key[1] !== current
      void client.cancelQueries({ predicate: (item) => stale(item.queryKey) })
      client.removeQueries({ predicate: (item) => stale(item.queryKey) })
      const mutations = client.getMutationCache()
      mutations.getAll().filter((item) => stale(item.options.mutationKey ?? [])).forEach((item) => mutations.remove(item))
    }
    cleanup()
    return subscribeSession(cleanup)
  }, [client])
  useEffect(() => {
    if (!token || !query.data) return
    const timer = setTimeout(() => invalidateSession(token), Math.max(0, Date.parse(query.data.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [token, query.data])
  const state: AuthState = {
    status: !token ? 'anonymous' : signingOut ? 'signing-out' : query.isPending ? 'checking' : query.isError ? 'error' : 'authenticated',
    session: token && !query.isError ? query.data : undefined,
    error: query.error, retry: () => { void query.refetch() },
  }
  return <AuthContext value={state}>{children}</AuthContext>
}
