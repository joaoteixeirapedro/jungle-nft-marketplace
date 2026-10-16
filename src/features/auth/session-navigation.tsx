import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { useSessionToken } from '@/hooks/use-session-token'
import { clearSessionIssue, getSessionIssue, subscribeSession } from '@/lib/session'
import { safeAuthRedirect } from '@/lib/auth-navigation'
import { useAvailability } from '@/hooks/use-availability'

export function SessionNavigation() {
  const token = useSessionToken()
  const previous = useRef(token)
  const issue = useSyncExternalStore(subscribeSession, getSessionIssue, () => null)
  const location = useRouterState({ select: (state) => state.location })
  const navigate = useNavigate()
  const router = useRouter()
  const notice = useAvailability()
  useEffect(() => {
    if (!issue) return
    clearSessionIssue()
    if (issue === 'logout' || issue === 'logout-failed') {
      void navigate({ to: '/', replace: true }).then(() => {
        if (issue === 'logout-failed') notice('A sessão local foi encerrada, mas a API não confirmou a revogação. A sessão simulada remota permanece sujeita à expiração. Tente novamente quando a conexão voltar.')
      })
    } else if (!['/login', '/register'].includes(location.pathname)) {
      void navigate({ to: '/login', search: { redirect: safeAuthRedirect(location.href), reason: issue }, replace: true })
    }
  }, [issue, location.href, location.pathname, navigate, notice])
  useEffect(() => {
    if (previous.current === token) return
    previous.current = token
    if (!issue) void router.invalidate()
  }, [token, issue, router])
  return null
}

