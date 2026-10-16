import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { AvailabilityProvider } from '@/components/ui/availability-provider'
import { SiteHeader, MobileNavigation } from './site-header'
import { SiteFooter } from './site-footer'
import { useMarketplaceRealtime } from '@/hooks/use-marketplace-realtime'
import { HomePage } from '@/routes/home'
import { SessionNavigation } from '@/features/auth/session-navigation'
import { RealtimeStatus } from './realtime-status'
import { useRealtimeState } from '@/services/socket/state'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const realtime = useRealtimeState()
  const discovery = pathname === '/' || pathname === '/marketplace'
  const detail = pathname.startsWith('/nfts/')
  const cart = pathname === '/cart'
  const checkout = pathname === '/checkout'
  const order = pathname.startsWith('/orders/')
  const authentication = pathname === '/login' || pathname === '/register'
  useMarketplaceRealtime(true)
  if (pathname === '/dev/diagnostics') return <div className="utility-shell page-container"><a href="#main" className="sr-only focus:not-sr-only">Pular para o conteúdo</a><nav aria-label="Navegação principal"><Link to="/">Início</Link><Link to="/marketplace">Mercado</Link></nav><main id="main" className="space-y-6 py-10"><Outlet /></main></div>
  if (authentication) return <AvailabilityProvider><SessionNavigation /><div inert aria-hidden="true" className="auth-background"><SiteHeader /><div className="page-container market-main"><HomePage /></div></div><main id="main"><Outlet /></main></AvailabilityProvider>
  return (
    <AvailabilityProvider><div className={`market-shell min-h-screen ${detail ? 'nft-shell' : ''} ${cart ? 'cart-shell' : ''} ${checkout || order ? 'purchase-shell' : ''}`}>
      <SessionNavigation />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-background focus:p-3">Pular para o conteúdo</a>
      {!order && <SiteHeader />}
      <main id="main" className="page-container market-main" data-realtime-state={realtime.phase}>
        <RealtimeStatus />
        <Outlet />
      </main>
      {(discovery || detail || cart || checkout) && <SiteFooter />}
      <nav aria-label="Ferramentas da demonstração" className="page-container diagnostics-access"><Link to="/dev/diagnostics" className="diagnostics-link">Abrir diagnóstico</Link></nav>
      {!detail && !cart && !checkout && !order && <MobileNavigation />}
    </div></AvailabilityProvider>
  )
}
