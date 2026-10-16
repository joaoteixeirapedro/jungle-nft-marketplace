import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { Nft } from '@/types/marketplace'
import { shareCatalog } from '@/lib/resource-versions'

export interface Favorites { items: Nft[] }
export const favoritesKey = (token: string | null) => ['favorites', token] as const
export const favoritesQuery = (token: string | null) => queryOptions({
  queryKey: favoritesKey(token), enabled: !!token,
  structuralSharing: shareCatalog,
  queryFn: async ({ signal }) => (await api.get<Favorites>('/favorites', { signal, headers: { Authorization: `Bearer ${token}` } })).data,
})
export async function changeFavorite(token: string, nftId: string, selected: boolean) {
  return (await api.request<Favorites>({ url: `/favorites/${encodeURIComponent(nftId)}`, method: selected ? 'PUT' : 'DELETE', headers: { Authorization: `Bearer ${token}` } })).data
}
