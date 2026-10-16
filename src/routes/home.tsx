import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Catalog } from '@/features/catalog/catalog'
import { HomeHero, HomeSections } from '@/features/catalog/home-sections'
import { validateCatalogSearch, type CatalogSearch } from '@/features/catalog/search'

export function HomePage() { return <DiscoveryPage home /> }
export function MarketplacePage() { return <DiscoveryPage /> }

function DiscoveryPage({ home = false }: { home?: boolean }) {
  const rawSearch = useSearch({ strict: false })
  const search = validateCatalogSearch({ ...rawSearch })
  const navigate = useNavigate()
  const onChange = useCallback((next: CatalogSearch, replace = false) => { void navigate({ to: home ? '/' : '/marketplace', search: validateCatalogSearch({ ...next }), replace, resetScroll: false }) }, [navigate, home])
  return <div className={`discovery-page ${home ? 'home-discovery' : 'full-catalog'}`}>
    {!home && <h1 className="catalog-page-title">Mercado de NFTs</h1>}
    <Catalog search={search} onChange={onChange} intro={home ? <HomeHero /> : undefined} />
    {home && <HomeSections />}
  </div>
}
