import { createRootRoute, createRoute, createRouter, lazyRouteComponent, stripSearchParams } from '@tanstack/react-router'
import { createElement } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { HomePage, MarketplacePage } from '@/routes/home'
import { catalogSearchValidator } from '@/features/catalog/search'
import { NotFoundPage } from '@/routes/not-found'
import { detailSearchValidator } from '@/features/nft/navigation'
import { authSearchValidator, requireAuthentication } from '@/features/auth/navigation'
import { ProtectedLayout, SessionFailure, SessionLoading } from '@/features/auth/protected-layout'

const rootRoute = createRootRoute({ component: AppShell, notFoundComponent: NotFoundPage })
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage, validateSearch: catalogSearchValidator, search: { middlewares: [stripSearchParams({ sort: 'recent', page: 1 })] } })
const marketplaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/marketplace', component: MarketplacePage, validateSearch: catalogSearchValidator, search: { middlewares: [stripSearchParams({ sort: 'recent', page: 1 })] } })
const nftRoute = createRoute({ getParentRoute: () => rootRoute, path: '/nfts/$nftId', component: lazyRouteComponent(() => import('@/routes/nft'), 'NftPage'), validateSearch: detailSearchValidator })
const diagnosticsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dev/diagnostics', component: lazyRouteComponent(() => import('@/routes/diagnostics'), 'DiagnosticsPage') })
const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cart', component: lazyRouteComponent(() => import('@/routes/cart'), 'CartPage') })
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: lazyRouteComponent(() => import('@/routes/auth'), 'LoginPage'), validateSearch: authSearchValidator })
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: lazyRouteComponent(() => import('@/routes/auth'), 'RegisterPage'), validateSearch: authSearchValidator })
const protectedRoute = createRoute({ getParentRoute: () => rootRoute, id: '_authenticated', component: ProtectedLayout, beforeLoad: ({ location }) => requireAuthentication(location.href), pendingComponent: SessionLoading, pendingMs: 0, errorComponent: () => createElement(SessionFailure) })
const favoritesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/favorites', component: lazyRouteComponent(() => import('@/routes/account'), 'FavoritesPage') })
const profileRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/profile', component: lazyRouteComponent(() => import('@/routes/account'), 'ProfilePage') })
const walletsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/wallets', component: lazyRouteComponent(() => import('@/routes/account'), 'WalletsPage') })
const ordersRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/orders', component: lazyRouteComponent(() => import('@/routes/orders'), 'OrdersPage') })
const orderRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/orders/$orderId', component: lazyRouteComponent(() => import('@/routes/orders'), 'OrderPage') })
const checkoutRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/checkout', component: lazyRouteComponent(() => import('@/routes/checkout'), 'CheckoutPage') })

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, marketplaceRoute, nftRoute, cartRoute, diagnosticsRoute, loginRoute, registerRoute, protectedRoute.addChildren([favoritesRoute, profileRoute, walletsRoute, ordersRoute, orderRoute, checkoutRoute])]),
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
