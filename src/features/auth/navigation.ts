import { redirect, type SearchSchemaInput } from '@tanstack/react-router'
import { safeAuthRedirect } from '@/lib/auth-navigation'
import { getSessionToken } from '@/lib/session'
import { queryClient } from '@/app/providers/query-client'
import { sessionQuery } from '@/services/api/auth'
import { ApiError } from '@/services/api/client'

export const authSearchValidator = (raw: { redirect?: string; reason?: string } & SearchSchemaInput) => ({
  redirect: safeAuthRedirect(raw.redirect), reason: raw.reason === 'expired' || raw.reason === 'invalid' ? raw.reason : undefined,
})
export async function requireAuthentication(href: string) {
  const token = getSessionToken()
  if (!token) throw redirect({ to: '/login', search: { redirect: safeAuthRedirect(href) }, replace: true })
  try { await queryClient.fetchQuery({ ...sessionQuery(token), staleTime: 0 }) } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect({ to: '/login', search: { redirect: safeAuthRedirect(href), reason: error.code === 'SESSION_EXPIRED' ? 'expired' : 'invalid' }, replace: true })
    throw error
  }
}
