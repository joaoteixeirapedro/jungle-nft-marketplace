import { queryOptions } from '@tanstack/react-query'
import { api } from '@/services/api/client'
import type { CatalogParams, Collection, Creator, Nft, NftDetail, PageResult } from '@/types/marketplace'
import { shareCatalog, shareNft } from '@/lib/resource-versions'

export const catalogQuery = (params: CatalogParams) => queryOptions({
  queryKey: ['catalog', params] as const,
  structuralSharing: shareCatalog,
  queryFn: async ({ signal }) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, Array.isArray(value) ? value.join(',') : String(value))
    }
    return (await api.get<PageResult<Nft>>('/nfts', { params: search, signal })).data
  },
})
export const collectionsQuery = queryOptions({ queryKey: ['collections'], queryFn: async ({ signal }) => (await api.get<{ items: Collection[] }>('/collections', { signal })).data.items })
export const creatorsQuery = queryOptions({ queryKey: ['creators'], queryFn: async ({ signal }) => (await api.get<{ items: Creator[] }>('/creators', { signal })).data.items })
export const nftQuery = (id: string) => queryOptions({ queryKey: ['nft', id], structuralSharing: shareNft, queryFn: async ({ signal }) => (await api.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal })).data })

// Curated homepage slots. Components still receive all NFT fields from REST.
export const homeHeroQuery = nftQuery('nft-001')
export const homeSecondaryQuery = nftQuery('nft-002')
