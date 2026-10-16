import { useEffect, useRef, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { NftCard, NftSkeletons } from '@/components/nft/nft-card'
import { catalogQuery, collectionsQuery, creatorsQuery } from '@/services/api/catalog'
import { CatalogFilters } from './filters'
import { SearchField } from './search-field'
import { catalogParams, sorts, type CatalogSearch } from './search'
import { DesignIcon } from '@/components/ui/design-icon'
import { FeaturedBanner } from './home-sections'
import { useAvailability } from '@/hooks/use-availability'

export function Catalog({ search, onChange, intro }: { search: CatalogSearch; onChange: (search: CatalogSearch, replace?: boolean) => void; intro?: ReactNode }) {
  const query = useQuery(catalogQuery(catalogParams(search)))
  const collections = useQuery(collectionsQuery)
  const creators = useQuery(creatorsQuery)
  const dialog = useRef<HTMLDialogElement>(null)
  const notice = useAvailability()
  const update = (changes: Partial<CatalogSearch>) => onChange({ ...search, ...changes, page: 1 })
  const clearFilters = () => onChange({ q: search.q, sort: search.sort, page: 1 })
  const clearAll = () => onChange({ sort: search.sort, page: 1 })
  const pagination = query.data?.pagination
  const lastPage = Math.max(1, pagination?.totalPages ?? 1)
  const invalidPage = !!pagination && search.page > lastPage
  // Server totals decide page bounds, including direct links and stock changes.
  useEffect(() => {
    if (invalidPage) onChange({ ...search, page: lastPage }, true)
  }, [invalidPage, lastPage, search, onChange])
  const filters = { search, update, clear: clearFilters, collections, creators }
  const activeCount = (search.category?.length ?? 0) + (search.network?.length ?? 0) + [search.minPrice, search.maxPrice, search.collectionId, search.creatorId, search.available].filter((value) => value !== undefined).length
  const sorting = <label className="catalog-sort">Ordenar por:<select className="field" value={search.sort} onChange={(event) => update({ sort: event.target.value as CatalogSearch['sort'] })}>{Object.entries(sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

  return <section aria-labelledby="catalog-title" className="discovery-catalog" id="catalog">
    <div className="discovery-search-row"><SearchField value={search.q ?? ''} resetKey={JSON.stringify(search)} onSearch={(q) => update({ q: q || undefined })} /><Button className="mobile-filter-toggle" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`Filtros${activeCount ? ` (${activeCount})` : ''}`}><DesignIcon file="bc3bf.svg" />{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</Button></div>
    {intro}
    <h2 id="catalog-title" className="sr-only">Todos os NFTs</h2>
    <div className="catalog-layout">
      <aside aria-label="Filtros do catálogo" className="desktop-filters"><CatalogFilters {...filters} prefix="desktop" /><FeaturedBanner /></aside>
      <div className="catalog-results min-w-0">
        <div className="catalog-toolbar">
          <nav aria-label="Exploração do catálogo" className="catalog-tabs"><button className="active" onClick={clearAll}>Todos os NFTs</button><button onClick={() => update({ sort: 'recent' })}>Novos lançamentos</button><button onClick={() => notice('O ranking de NFTs em alta ainda não está disponível nesta demonstração.')}>Em alta</button></nav>
          <div className="desktop-sort">{sorting}</div>
        </div>
        <p role="status" aria-live="polite" className="catalog-status">{query.isPending || invalidPage ? 'Carregando NFTs…' : query.isFetching ? 'Atualizando resultados…' : query.isError ? 'Falha ao carregar o catálogo.' : `${pagination?.totalItems ?? 0} NFTs encontrados${activeCount ? ` · ${activeCount} filtros ativos` : ''}`}</p>
        <div aria-busy={query.isFetching || invalidPage}>
          {query.isPending || invalidPage ? <NftSkeletons /> : query.isError ? <div className="catalog-message" role="alert"><h3 className="text-lg font-semibold">Não foi possível carregar os NFTs</h3><p>Verifique sua conexão e tente novamente.</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button></div>
            : !query.data?.items.length ? <div className="catalog-message"><h3 className="text-lg font-semibold">Nenhum NFT encontrado</h3><p>Experimente outros termos ou remova os filtros.</p><Button variant="outline" onClick={clearAll}>Limpar pesquisa e filtros</Button></div>
              : <div className="nft-grid">{query.data.items.map((nft) => <NftCard key={nft.id} nft={nft} collection={collections.data?.find((item) => item.id === nft.collectionId)?.name} />)}</div>}
        </div>
        {!query.isError && !query.isPending && !invalidPage && (pagination?.totalPages ?? 0) > 0 && <nav aria-label="Paginação dos NFTs" className="catalog-pagination">
          <Button variant="outline" disabled={search.page <= 1} onClick={() => onChange({ ...search, page: search.page - 1 })}>Anterior</Button>
          {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => Math.min(Math.max(search.page - 2, 1), Math.max(lastPage - 4, 1)) + index).map((page) => <Button key={page} variant={page === search.page ? 'default' : 'outline'} aria-label={`Página ${page}`} aria-current={page === search.page ? 'page' : undefined} onClick={() => onChange({ ...search, page })}>{page}</Button>)}
          <Button variant="outline" disabled={search.page >= lastPage} onClick={() => onChange({ ...search, page: search.page + 1 })}>Próxima</Button>
        </nav>}
      </div>
    </div>
    <dialog ref={dialog} className="filter-dialog" aria-labelledby="filter-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }} onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, summary, [tabindex]')].filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
      <div className="space-y-6 p-6"><div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold" id="filter-dialog-title">Filtros do catálogo</h2><Button variant="outline" onClick={() => dialog.current?.close()} autoFocus>Fechar filtros</Button></div><p className="text-sm text-muted-foreground">{pagination?.totalItems ?? 0} NFTs encontrados</p>{sorting}<CatalogFilters {...filters} prefix="mobile" /><Button className="w-full" onClick={() => dialog.current?.close()}>Ver resultados</Button></div>
    </dialog>
  </section>
}
