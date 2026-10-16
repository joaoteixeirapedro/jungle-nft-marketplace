import type { AnchorHTMLAttributes } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useAuthNavigation, type AuthDialogState } from './modal-navigation'
import { safeAuthRedirect } from '@/lib/auth-navigation'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & Partial<AuthDialogState> & { replace?: boolean }

export function AuthLink({ mode = 'login', redirect, reason, replace = false, onClick, ...props }: Props) {
  const open = useAuthNavigation()
  const destination = useRouterState({ select: (state) => safeAuthRedirect(redirect ?? state.location.state.authDialog?.redirect ?? state.location.href) })
  return <Link {...props} to={mode === 'login' ? '/login' : '/register'} search={{ redirect: destination, reason }} preload={false}
    activeProps={{ 'aria-current': props['aria-current'] }} onClick={(event) => {
      onClick?.(event)
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return
      event.preventDefault()
      void open({ mode, redirect: destination, reason }, replace)
    }} />
}
