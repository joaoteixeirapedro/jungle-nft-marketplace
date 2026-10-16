import { useRouter, type ParsedLocation } from '@tanstack/react-router'
import { safeAuthRedirect } from '@/lib/auth-navigation'
import { rememberAuthTrigger } from './focus'

export interface AuthDialogState {
  mode: 'login' | 'register'
  redirect: string
  reason?: 'expired' | 'invalid'
}

declare module '@tanstack/react-router' {
  interface HistoryState {
    authDialog?: AuthDialogState
  }
}

// Keep the real route mounted; only the address bar is masked with the auth URL.
// Private routes are deliberately excluded from the background after expiration.
export function authenticationNavigation(location: ParsedLocation | undefined, options: Partial<AuthDialogState> = {}) {
  const mode = options.mode ?? 'login'
  const search = { redirect: safeAuthRedirect(options.redirect ?? location?.href), reason: options.reason }
  const to = mode === 'login' ? '/login' as const : '/register' as const
  if (!location || !/^(\/|\/marketplace|\/cart|\/nfts\/[\w-]+)$/.test(location.pathname)) {
    const query = new URLSearchParams({ redirect: search.redirect })
    if (search.reason) query.set('reason', search.reason)
    return { href: `${to}?${query}` }
  }
  return {
    href: location.href,
    state: { ...location.state, authDialog: { mode, ...search } },
    mask: { to, search },
    resetScroll: false,
  }
}

export function useAuthNavigation() {
  const router = useRouter()
  return (options: Partial<AuthDialogState> = {}, replace = false) => {
    rememberAuthTrigger()
    return router.navigate({ ...authenticationNavigation(router.state.location, options), replace })
  }
}
