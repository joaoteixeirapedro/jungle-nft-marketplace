import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { Cart, CartLineInput, Quote, QuoteRequest } from '@/types/marketplace'
import { shareCart } from '@/lib/resource-versions'

export type CartIdentity = string | null
export const cartKey = (token: CartIdentity) => ['cart', token] as const
export const quoteKey = (token: CartIdentity) => ['quote', token] as const
const headers = (token: CartIdentity) => ({ Authorization: token ? `Bearer ${token}` : '' })
export const cartQuery = (token: CartIdentity) => queryOptions({
  queryKey: cartKey(token), retry: false, staleTime: 0,
  structuralSharing: shareCart,
  queryFn: async ({ signal }) => (await api.get<Cart>('/cart', { signal, headers: headers(token) })).data,
})
// Includes current edition prices/availability: stock events need not increment cart.version.
export const cartFingerprint = (cart: Cart) => JSON.stringify([cart.id, cart.version, cart.items, cart.couponCode, cart.couponStatus, cart.issues])
export const quoteValues = (quote: Quote) => JSON.stringify([quote.cartVersion, quote.items, quote.couponCode, quote.network, quote.walletId, quote.subtotalEth, quote.discountEth, quote.networkFeeEth, quote.totalEth])
export const quoteQuery = (token: CartIdentity, fingerprint: string, context?: QuoteRequest) => queryOptions({
  queryKey: context ? [...quoteKey(token), fingerprint, context] : [...quoteKey(token), fingerprint], retry: false, staleTime: 0,
  queryFn: ({ signal }) => cartApi.quote(token, signal, context),
})
export type CartOperation = { kind: 'add'; item: CartLineInput } | { kind: 'quantity'; id: string; quantity: number } | { kind: 'remove'; id: string } | { kind: 'coupon'; code: string | null }
export const cartApi = {
  async change(token: CartIdentity, operation: CartOperation) {
    const config = { headers: headers(token) }
    switch (operation.kind) {
      case 'add': return (await api.post<Cart>('/cart/items', operation.item, config)).data
      case 'quantity': return (await api.patch<Cart>(`/cart/items/${encodeURIComponent(operation.id)}`, { quantity: operation.quantity }, config)).data
      case 'remove': return (await api.delete<Cart>(`/cart/items/${encodeURIComponent(operation.id)}`, config)).data
      case 'coupon': return (operation.code === null ? await api.delete<Cart>('/cart/coupon', config) : await api.put<Cart>('/cart/coupon', { code: operation.code }, config)).data
    }
  },
  async quote(token: CartIdentity, signal?: AbortSignal, context: QuoteRequest = {}) {
    return (await api.post<Quote>('/quotes', context, { signal, headers: headers(token) })).data
  },
}
