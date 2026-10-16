import { Link, useRouterState, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { DesignIcon } from '@/components/ui/design-icon'
import { useAvailability } from '@/hooks/use-availability'
import { catalogReturn } from '@/features/nft/navigation'
import { validateCatalogSearch } from '@/features/catalog/search'
import { useAuth } from '@/features/auth/auth-context'
import { useLogout } from '@/hooks/use-logout'
import { AuthLink } from '@/features/auth/auth-link'
import { useCart } from '@/features/cart/use-cart'

function CartEntry({ mobile = false }: { mobile?: boolean }) {
  const cart = useCart()
  const count = cart.ready && !cart.isError ? cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) : undefined
  return <Link to="/cart" preload={false} className={mobile ? 'cart-entry' : 'icon-button cart-entry'} aria-label={`Carrinho${count ? `, ${count} itens` : ''}`}><DesignIcon file={mobile ? '352b3.svg' : 'c0c08.svg'} />{count !== undefined && count > 0 && <span className="cart-count" aria-hidden="true">{count}</span>}</Link>
}

function AccountEntry() {
  const auth = useAuth()
  const logout = useLogout()
  if (auth.status === 'checking') return <Button disabled aria-busy="true">Verificando sessão…</Button>
  if (auth.status === 'error') return <Button variant="outline" onClick={auth.retry}>Verificar sessão</Button>
  if (auth.status === 'authenticated' || auth.status === 'signing-out') return <div className="account-entry"><Button asChild><Link to="/profile" preload={false} aria-label={`Minha conta, ${auth.session?.user.username}`} >{auth.session?.user.avatarUrl && <img className="header-avatar" src={auth.session.user.avatarUrl} alt="Seu avatar" />}Minha conta</Link></Button><button className="icon-button" aria-label="Sair da conta" disabled={logout.pending} onClick={logout.logout}><DesignIcon file="62554.svg" /></button></div>
  return <Button asChild><AuthLink data-auth-entry><DesignIcon file="62554.svg" />Entrar</AuthLink></Button>
}

export function SiteHeader() {
  const notice = useAvailability()
  const rawSearch = useSearch({ strict: false })
  const detail = useRouterState({ select: (state) => state.location.pathname.startsWith('/nfts/') || state.location.pathname === '/cart' || state.location.pathname === '/checkout' })
  const search = detail ? catalogReturn(rawSearch.returnTo).search : validateCatalogSearch({ ...rawSearch })
  const creatorsSelected = useRouterState({ select: (state) => state.location.hash === 'creator-filter' })
  return <header className="site-header page-container">
    <Link to="/" className="wordmark" aria-label="Kurio, início">KURIO</Link>
    <nav aria-label="Navegação principal" className="desktop-navigation">
      <Link to="/" activeOptions={{ exact: true, includeSearch: false }}>Início</Link>
      <Link to="/marketplace" search={search} className={detail ? 'detail-market-active' : undefined} activeOptions={{ exact: true, includeSearch: false, includeHash: creatorsSelected }}>Mercado</Link>
      <Link to="/marketplace" search={search} hash="creator-filter" activeOptions={{ exact: true, includeSearch: false, includeHash: true }}>Criadores</Link>
      <button onClick={() => notice('O conteúdo educativo ainda não está disponível nesta demonstração.')}>Aprenda</button>
    </nav>
    <div className="header-actions">
      <Link to="/marketplace" search={search} hash="catalog-search" className="icon-button" aria-label="Pesquisar NFTs"><DesignIcon file="bd8c9.svg" /></Link>
      <CartEntry />
      <AccountEntry />
    </div>
  </header>
}

export function MobileNavigation() {
  const auth = useAuth()
  return <nav aria-label="Navegação mobile" className="mobile-navigation">
    <Link to="/" aria-label="Início" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}><DesignIcon file="b096d.svg" /></Link>
    {auth.status === 'anonymous' ? <AuthLink redirect="/favorites" aria-label="Favoritos"><DesignIcon file="c40be.svg" /></AuthLink> : <Link to="/favorites" preload={false} aria-label="Favoritos"><DesignIcon file="c40be.svg" /></Link>}
    <span className="mobile-navigation-background" aria-hidden="true"><DesignIcon file="3b81f.svg" /></span>
    <Link to="/marketplace" aria-label="Explorar mercado" className="mobile-explore"><DesignIcon file="b1ba5.svg" /><span className="bag-icon"><DesignIcon file="d5458.svg" /><DesignIcon file="ca931.svg" /><DesignIcon file="97351.svg" /><DesignIcon file="f7581.svg" /><DesignIcon file="db42b.svg" /></span></Link>
    <CartEntry mobile />
    {auth.status === 'checking' || auth.status === 'error' ? <button aria-label={auth.status === 'checking' ? 'Verificando sessão' : 'Verificar sessão'} disabled={auth.status === 'checking'} onClick={auth.retry}><DesignIcon file="99dca.svg" /></button> : auth.status === 'authenticated' || auth.status === 'signing-out' ? <Link to="/profile" preload={false} aria-label="Minha conta">{auth.session?.user.avatarUrl ? <img className="mobile-account-avatar" src={auth.session.user.avatarUrl} alt="Seu avatar" /> : <DesignIcon file="99dca.svg" />}</Link> : <AuthLink aria-label="Entrar" data-auth-entry><DesignIcon file="99dca.svg" /></AuthLink>}
  </nav>
}

