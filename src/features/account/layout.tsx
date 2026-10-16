import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import { useLogout } from '@/hooks/use-logout'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import '@/features/account/account.css'

export function AccountNavigation() {
  const logout = useLogout()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return <aside className="account-sidebar"><h2>Meu perfil</h2><nav className="account-navigation" aria-label="Conta do colecionador"><Link to="/profile" preload={false} aria-label="Meu perfil, Dados do perfil" activeOptions={{ exact: true, includeSearch: false }}><span className="account-nav-icon"><DesignIcon file={pathname === '/profile' ? 'account-profile.png' : 'account-profile-inactive.png'} /></span>Dados do perfil</Link><Link to="/wallets" preload={false}><span className="account-nav-icon"><DesignIcon file={pathname === '/wallets' ? 'account-wallets-active.png' : 'account-wallets.png'} /></span>Carteiras</Link><Link to="/favorites" preload={false}><span className="account-nav-icon"><DesignIcon file="account-favorites.png" /></span>Favoritos</Link><Link to="/orders" preload={false} activeOptions={{ exact: true }}><span className="account-nav-icon"><DesignIcon file="account-shopping.svg" /></span>Pedidos</Link><Link to="/checkout" preload={false}><span className="account-nav-icon"><DesignIcon file="account-shopping.svg" /></span>Checkout</Link></nav><Button className="account-logout" variant="outline" disabled={logout.pending} onClick={logout.logout}><span className="account-nav-icon"><DesignIcon file="account-logout.svg" /></span>{logout.pending ? 'Saindo…' : 'Sair da conta'}</Button></aside>
}
export function AccountLayout({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const { session } = useAuth()
  return <section className={`account-page collector-account ${className}`}><h1 className="sr-only">{title}</h1><AccountNavigation /><div className="account-content"><p className="account-current">Conta: <strong data-testid="account-identity">{session!.user.username}</strong></p>{children}</div></section>
}


