import { useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { formatEth, parseEth } from '@/lib/eth'
import type { Collection, Creator } from '@/types/marketplace'
import { categories, networks, type CatalogSearch } from './search'

type Options = Pick<UseQueryResult<Collection[] | Creator[]>, 'data' | 'isPending' | 'isError' | 'refetch'>
export interface FiltersProps { search: CatalogSearch; update: (changes: Partial<CatalogSearch>) => void; clear: () => void; collections: Options; creators: Options; prefix: string }

function PriceRange({ search, update, prefix }: Pick<FiltersProps, 'search' | 'update' | 'prefix'>) {
  const [error, setError] = useState('')
  const [minPrice, setMinPrice] = useState(search.minPrice ?? '')
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? '')
  const cents = (value: string, fallback: number) => {
    try { const amount = parseEth(value) / (10n ** 16n); return Number(amount > 1230n ? 1230n : amount) } catch { return fallback }
  }
  return <form className="space-y-3" onSubmit={(event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const min = String(form.get('minPrice')).trim().replace(',', '.')
    const max = String(form.get('maxPrice')).trim().replace(',', '.')
    try {
      if (min) parseEth(min)
      if (max) parseEth(max)
      if (min && max && parseEth(min) > parseEth(max)) throw new Error()
      setError(''); update({ minPrice: min || undefined, maxPrice: max || undefined })
    } catch { setError('Informe valores em ETH válidos; o máximo deve ser maior ou igual ao mínimo.') }
  }}>
    <h3 className="font-semibold">Faixa de preço</h3>
    <div className="price-sliders"><span className="price-track" /><span className="price-track-active" style={{ left: `${100 * cents(minPrice, 0) / 1230}%`, right: `${100 - 100 * cents(maxPrice, 1230) / 1230}%` }} />
      <input type="range" min="0" max="1230" step="1" aria-label="Preço mínimo no controle deslizante" aria-valuetext={`${minPrice || '0'} ETH`} value={cents(minPrice, 0)} onChange={(event) => setMinPrice(formatEth(BigInt(Math.min(Number(event.target.value), cents(maxPrice, 1230))) * 10n ** 16n))} />
      <input type="range" min="0" max="1230" step="1" aria-label="Preço máximo no controle deslizante" aria-valuetext={`${maxPrice || '12.3'} ETH`} value={cents(maxPrice, 1230)} onChange={(event) => setMaxPrice(formatEth(BigInt(Math.max(Number(event.target.value), cents(minPrice, 0))) * 10n ** 16n))} />
    </div>
    <div className="flex gap-2">
      <label className="min-w-0 flex-1 text-xs">Mínimo<input className="field mt-2 w-full" name="minPrice" inputMode="decimal" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${prefix}-price-error` : undefined} /></label>
      <label className="min-w-0 flex-1 text-xs">Máximo<input className="field mt-2 w-full" name="maxPrice" inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${prefix}-price-error` : undefined} /></label>
    </div>
    {error && <p role="alert" id={`${prefix}-price-error`} className="text-xs text-destructive">{error}</p>}
    <Button variant="outline" type="submit" className="w-full">Aplicar preço</Button>
  </form>
}

function EntitySelect({ title, value, options, onChange, id }: { title: string; value?: string; options: Options; onChange: (value?: string) => void; id?: string }) {
  return <div className="space-y-2">
    <label className="block space-y-2 text-sm font-semibold"><span>{title}</span>
      <select id={id} className="field w-full font-normal" value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)} disabled={options.isPending || options.isError}>
        <option value="">{options.isPending ? 'Carregando…' : 'Todos'}</option>
        {value && !options.data?.some((item) => item.id === value) && <option value={value}>Seleção indisponível</option>}
        {options.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select>
    </label>
    {options.isError && <div className="text-sm" role="alert">Não foi possível carregar {title.toLowerCase()}. <button className="underline" onClick={() => void options.refetch()}>Tentar novamente</button></div>}
  </div>
}

export function CatalogFilters({ search, update, clear, collections, creators, prefix }: FiltersProps) {
  return <div className="catalog-filters space-y-6">
    <fieldset className="space-y-1"><legend className="mb-2 font-semibold">Categorias</legend>
      {Object.entries(categories).map(([value, label]) => <label className="filter-check" key={value}><input type="checkbox" checked={search.category?.includes(value as keyof typeof categories) ?? false} onChange={(event) => {
        const selected = new Set(search.category)
        if (event.target.checked) selected.add(value as keyof typeof categories); else selected.delete(value as keyof typeof categories)
        update({ category: selected.size ? [...selected].sort() : undefined })
      }} />{label}</label>)}
    </fieldset>
    <PriceRange key={`${search.minPrice}-${search.maxPrice}`} search={search} update={update} prefix={prefix} />
    <fieldset className="space-y-1"><legend className="mb-2 font-semibold">Redes</legend>
      {Object.entries(networks).map(([value, label]) => <label className="filter-check" key={value}><input type="checkbox" checked={search.network?.includes(value as keyof typeof networks) ?? false} onChange={(event) => {
        const selected = new Set(search.network)
        if (event.target.checked) selected.add(value as keyof typeof networks); else selected.delete(value as keyof typeof networks)
        update({ network: selected.size ? [...selected].sort() : undefined })
      }} />{label}</label>)}
    </fieldset>
    <details className="advanced-filters" open={!!search.collectionId || !!search.creatorId || search.available !== undefined}><summary id={prefix === 'desktop' ? 'creator-filter' : 'mobile-creator-filter'}>Mais filtros</summary><div className="space-y-5 pt-4">
    <EntitySelect title="Coleção" value={search.collectionId} options={collections} onChange={(collectionId) => update({ collectionId })} />
    <EntitySelect title="Criador" value={search.creatorId} options={creators} onChange={(creatorId) => update({ creatorId })} />
    <label className="block space-y-2 text-sm font-semibold"><span>Disponibilidade</span><select className="field w-full font-normal" value={search.available === undefined ? '' : String(search.available)} onChange={(event) => update({ available: event.target.value === '' ? undefined : event.target.value === 'true' })}><option value="">Todos</option><option value="true">Disponíveis</option><option value="false">Esgotados</option></select></label>
    </div></details>
    <Button variant="outline" onClick={clear} className="w-full">Limpar filtros</Button>
  </div>
}
