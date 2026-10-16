import { formatEth, parseEth } from '@/lib/eth'
import type { CatalogParams, Category, Network } from '@/types/marketplace'
import type { SearchSchemaInput } from '@tanstack/react-router'

export const categories: Record<Category, string> = { art: 'Arte digital', photography: 'Fotografia', music: 'Música', '3d': 'Arte 3D', collectibles: 'Colecionáveis', generative: 'Generativo', gaming: 'Jogos' }
export const networks: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
export const sorts = { recent: 'Listados recentemente', 'price-asc': 'Menor preço', 'price-desc': 'Maior preço', name: 'Nome: A–Z' } as const
export type CatalogSearch = Omit<CatalogParams, 'pageSize' | 'sort' | 'page'> & { sort: keyof typeof sorts; page: number }

function choices<T extends string>(value: unknown, allowed: Record<T, string>): T[] | undefined {
  const values: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const valid = [...new Set(values.filter((item): item is T => typeof item === 'string' && Object.hasOwn(allowed, item)))].sort()
  return valid.length ? valid : undefined
}
function amount(value: unknown) {
  if (typeof value !== 'string') return undefined
  try { return formatEth(parseEth(value)) } catch { return undefined }
}
export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const page = Number(raw.page)
  const minPrice = amount(raw.minPrice)
  const maxPrice = amount(raw.maxPrice)
  const validRange = !minPrice || !maxPrice || parseEth(minPrice) <= parseEth(maxPrice)
  const id = (value: unknown) => typeof value === 'string' && /^[\w-]{1,80}$/.test(value) ? value : undefined
  return {
    q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 120) || undefined : undefined,
    category: choices(raw.category, categories), network: choices(raw.network, networks),
    collectionId: id(raw.collectionId), creatorId: id(raw.creatorId),
    minPrice: validRange ? minPrice : undefined, maxPrice: validRange ? maxPrice : undefined,
    available: raw.available === true || raw.available === 'true' ? true : raw.available === false || raw.available === 'false' ? false : undefined,
    sort: typeof raw.sort === 'string' && Object.hasOwn(sorts, raw.sort) ? raw.sort as CatalogSearch['sort'] : 'recent',
    page: Number.isSafeInteger(page) && page >= 1 && page <= 1_000_000 ? page : 1,
  }
}

export function catalogParams(search: CatalogSearch): CatalogParams { return { ...search, pageSize: 9 } }

// Router marker distinguishes optional URL input from the normalized defaults.
export const catalogSearchValidator = (raw: Partial<CatalogSearch> & SearchSchemaInput) => validateCatalogSearch({ ...raw })
