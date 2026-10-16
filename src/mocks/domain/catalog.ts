import { parseEth } from '../../lib/eth.ts'
import type { CatalogParams, Nft, NftDetail, PageResult } from '../../types/marketplace.ts'
import { invalid, MockError } from '../errors.ts'
import type { MockDatabase, StoredNft } from '../state/model.ts'
import { nextId, now, type DomainEvent } from '../state/store.ts'

export const available = (edition: StoredNft['editions'][number]) => edition.supply - edition.sold - edition.reserved
export function findNft(db: MockDatabase, id: string): StoredNft {
  const nft = db.nfts.find((item) => item.id === id)
  if (!nft) throw new MockError(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
  return nft
}
export function findEdition(nft: StoredNft, id: string) {
  const edition = nft.editions.find((item) => item.id === id)
  if (!edition) throw new MockError(404, 'EDITION_NOT_FOUND', 'Edição não encontrada neste NFT.')
  return edition
}
export function nftView(nft: StoredNft): Nft {
  const editions = nft.editions.map((edition) => ({ id: edition.id, label: edition.label, supply: edition.supply, availableQuantity: available(edition), priceEth: edition.priceEth }))
  const priceEth = editions.reduce((lowest, edition) => parseEth(edition.priceEth) < parseEth(lowest) ? edition.priceEth : lowest, editions[0]!.priceEth)
  return { ...nft, editions, priceEth, availableQuantity: editions.reduce((sum, edition) => sum + edition.availableQuantity, 0) }
}
export function nftDetail(db: MockDatabase, id: string): NftDetail {
  const nft = findNft(db, id)
  return { ...nftView(nft), creator: db.creators.find((item) => item.id === nft.creatorId)!, collection: db.collections.find((item) => item.id === nft.collectionId)! }
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function listNfts(db: MockDatabase, params: CatalogParams): PageResult<Nft> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 9
  const items = db.scenario.name === 'empty' ? [] : db.nfts.map(nftView).filter((nft) => {
    const creator = db.creators.find((item) => item.id === nft.creatorId)!
    const collection = db.collections.find((item) => item.id === nft.collectionId)!
    return (!params.q || normalize(`${nft.name} ${nft.description} ${creator.name} ${collection.name}`).includes(normalize(params.q)))
      && (!params.category?.length || params.category.includes(nft.category)) && (!params.network?.length || params.network.includes(nft.network))
      && (!params.collectionId || params.collectionId === nft.collectionId) && (!params.creatorId || params.creatorId === nft.creatorId)
      && (params.minPrice === undefined || parseEth(nft.priceEth) >= parseEth(params.minPrice)) && (params.maxPrice === undefined || parseEth(nft.priceEth) <= parseEth(params.maxPrice))
      && (params.available === undefined || (nft.availableQuantity > 0) === params.available)
  })
  items.sort((a, b) => {
    if (params.sort === 'name') return a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id)
    if (params.sort === 'price-asc' || params.sort === 'price-desc') {
      const comparison = parseEth(a.priceEth) < parseEth(b.priceEth) ? -1 : parseEth(a.priceEth) > parseEth(b.priceEth) ? 1 : 0
      return (params.sort === 'price-desc' ? -comparison : comparison) || a.id.localeCompare(b.id)
    }
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  })
  return { items: items.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) } }
}

export function emitNft(db: MockDatabase, events: DomainEvent[], nft: StoredNft) {
  events.push({ type: 'nft.updated', payload: { id: nextId(db, 'event'), resourceId: nft.id, version: nft.version, occurredAt: new Date(now(db)).toISOString(), data: nftView(nft) } })
}
export function updateNft(db: MockDatabase, events: DomainEvent[], id: string, editionId: string, changes: { priceEth?: string; availableQuantity?: number }) {
  const nft = findNft(db, id)
  const edition = findEdition(nft, editionId)
  if (changes.priceEth === undefined && changes.availableQuantity === undefined) invalid('changes', 'Informe preço ou disponibilidade.')
  if (changes.priceEth !== undefined) edition.priceEth = changes.priceEth
  if (changes.availableQuantity !== undefined) edition.supply = edition.sold + edition.reserved + changes.availableQuantity
  nft.version++
  emitNft(db, events, nft)
  return nftView(nft)
}
