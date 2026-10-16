import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CreateOrderRequest, Network, Order, Receipt, Wallet, WalletConnection } from '@/types/marketplace'
import { newerOrder, newerResource, shareOrder, shareOrders } from '@/lib/resource-versions'

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
export const walletsQuery = (token: string) => queryOptions({
  queryKey: ['wallets', token] as const, staleTime: 0, retry: false,
  structuralSharing: (before, next) => {
    const previous = before as { items: Wallet[] } | undefined
    const incoming = next as { items: Wallet[] }
    return { items: incoming.items.map((wallet) => newerResource(previous?.items.find((item) => item.id === wallet.id), wallet)) }
  },
  queryFn: async ({ signal }) => (await api.get<{ items: Wallet[] }>('/wallets', { signal, headers: headers(token) })).data,
})
export const ordersQuery = (token: string) => queryOptions({
  queryKey: ['orders', token] as const, staleTime: 0, retry: false,
  structuralSharing: shareOrders,
  queryFn: async ({ signal }) => (await api.get<{ items: Order[] }>('/orders', { signal, headers: headers(token) })).data,
})
export const orderQuery = (token: string, id: string) => queryOptions({
  queryKey: ['order', token, id] as const, staleTime: 0, retry: false,
  structuralSharing: shareOrder,
  queryFn: async ({ signal }) => (await api.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal, headers: headers(token) })).data,
  refetchInterval: (query) => query.state.data?.status === 'pending' ? 2000 : false,
})
export const receiptQuery = (token: string, id: string) => queryOptions({
  queryKey: ['receipt', token, id] as const, staleTime: Infinity, retry: false,
  queryFn: async ({ signal }) => (await api.get<Receipt>(`/orders/${encodeURIComponent(id)}/receipt`, { signal, headers: headers(token) })).data,
})
export const checkoutApi = {
  async connect(token: string, walletId: string, network: Network) {
    return (await api.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connection`, { network }, { headers: headers(token) })).data
  },
  async disconnect(token: string, walletId: string) { await api.delete(`/wallets/${encodeURIComponent(walletId)}/connection`, { headers: headers(token) }) },
  async createOrder(token: string, key: string, payload: CreateOrderRequest) {
    return (await api.post<Order>('/orders', payload, { headers: { ...headers(token), 'Idempotency-Key': key } })).data
  },
}
export async function reconcilePurchase(client: QueryClient, token: string, order: Order) {
  client.setQueryData<Order>(orderQuery(token, order.id).queryKey, (previous) => newerOrder(previous, order))
  await Promise.all([
    client.invalidateQueries({ queryKey: ['orders', token] }),
    client.invalidateQueries({ queryKey: ['cart', token] }),
    client.invalidateQueries({ queryKey: ['catalog'] }),
    ...order.items.map((item) => client.invalidateQueries({ queryKey: ['nft', item.nftId] })),
  ])
  await client.invalidateQueries({ queryKey: ['quote', token], refetchType: 'none' })
}
