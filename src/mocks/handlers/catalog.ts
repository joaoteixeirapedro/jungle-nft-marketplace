import { http, HttpResponse } from 'msw'
import { formatEth, parseEth } from '../../lib/eth.ts'
import type { CatalogParams, Category } from '../../types/marketplace.ts'
import { invalid, integer } from '../errors.ts'
import { apiPath, respond } from '../http.ts'
import { listNfts, nftDetail } from '../domain/catalog.ts'
import { network } from '../domain/wallets.ts'
import { transaction } from '../state/store.ts'

export function eth(value: unknown, field: string): string {
  if (typeof value !== 'string') invalid(field, 'Informe uma string decimal em ETH.')
  try { return formatEth(parseEth(value)) } catch { return invalid(field, 'Valor ETH inválido, com no máximo 18 casas decimais.') }
}
function catalogParams(url: URL): CatalogParams {
  const search = url.searchParams
  const params: CatalogParams = {}
  const q = search.get('q')
  if (q !== null) { if (q.length > 120) invalid('q', 'Use até 120 caracteres.'); params.q = q.trim() }
  const categories = search.getAll('category').flatMap((value) => value.split(','))
  if (categories.length) {
    if (categories.some((value) => !['art', 'photography', 'music', '3d', 'collectibles', 'generative', 'gaming'].includes(value))) invalid('category', 'Categoria inválida.')
    params.category = categories as Category[]
  }
  const networks = search.getAll('network').flatMap((value) => value.split(','))
  if (networks.length) params.network = networks.map(network)
  if (search.has('collectionId')) params.collectionId = search.get('collectionId')!
  if (search.has('creatorId')) params.creatorId = search.get('creatorId')!
  if (search.has('minPrice')) params.minPrice = eth(search.get('minPrice'), 'minPrice')
  if (search.has('maxPrice')) params.maxPrice = eth(search.get('maxPrice'), 'maxPrice')
  if (params.minPrice && params.maxPrice && parseEth(params.minPrice) > parseEth(params.maxPrice)) invalid('maxPrice', 'Máximo deve ser maior ou igual ao mínimo.')
  if (search.has('available')) {
    if (!['true', 'false'].includes(search.get('available')!)) invalid('available', 'Use true ou false.')
    params.available = search.get('available') === 'true'
  }
  const sort = search.get('sort')
  if (sort !== null) {
    if (!['recent', 'price-asc', 'price-desc', 'name'].includes(sort)) invalid('sort', 'Ordenação inválida.')
    params.sort = sort as CatalogParams['sort']
  }
  if (search.has('page')) params.page = integer(Number(search.get('page')), 'page', 1, 1_000_000)
  if (search.has('pageSize')) params.pageSize = integer(Number(search.get('pageSize')), 'pageSize', 1, 100)
  return params
}

export const catalogHandlers = [
  http.get(apiPath('/nfts'), ({ request }) => respond(async () => {
    const params = catalogParams(new URL(request.url))
    return HttpResponse.json(await transaction((db) => listNfts(db, params)))
  }, request)),
  http.get(apiPath('/nfts/:id'), ({ request, params }) => respond(async () => HttpResponse.json(await transaction((db) => nftDetail(db, String(params.id)))), request)),
  http.get(apiPath('/collections'), ({ request }) => respond(async () => HttpResponse.json({ items: await transaction((db) => db.collections) }), request)),
  http.get(apiPath('/creators'), ({ request }) => respond(async () => HttpResponse.json({ items: await transaction((db) => db.creators) }), request)),
]
