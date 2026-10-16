import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import { sessionKey } from './auth'
import { getSessionToken } from '@/lib/session'
import { newerResource } from '@/lib/resource-versions'
import type { AvatarUpdate, PasswordUpdate, Profile, ProfileUpdate, SessionResponse, Wallet, WalletInput } from '@/types/marketplace'

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
export const profileQuery = (token: string) => queryOptions({
  queryKey: ['profile', token] as const, staleTime: 0, retry: false,
  structuralSharing: (before, next) => newerResource(before as Profile | undefined, next as Profile),
  queryFn: async ({ signal }) => (await api.get<Profile>('/profile', { signal, headers: headers(token) })).data,
})
export const accountApi = {
  async profile(token: string, input: ProfileUpdate) { return (await api.patch<Profile>('/profile', input, { headers: headers(token) })).data },
  async avatar(token: string, input: AvatarUpdate) { return (await api.patch<Profile>('/profile/avatar', input, { headers: headers(token) })).data },
  async password(token: string, input: PasswordUpdate, signal: AbortSignal) { return (await api.post<{ status: 'ok' }>('/profile/password', input, { signal, headers: headers(token) })).data },
  async wallet(token: string, input: Partial<WalletInput>, id?: string) {
    return id ? (await api.patch<Wallet>(`/wallets/${encodeURIComponent(id)}`, input, { headers: headers(token) })).data : (await api.post<Wallet>('/wallets', input, { headers: headers(token) })).data
  },
}
export async function acceptProfile(client: QueryClient, token: string, profile: Profile) {
  if (getSessionToken() !== token) return
  await Promise.all([client.cancelQueries({ queryKey: profileQuery(token).queryKey }), client.cancelQueries({ queryKey: sessionKey(token) })])
  if (getSessionToken() !== token) return
  client.setQueryData<Profile>(profileQuery(token).queryKey, (before) => newerResource(before, profile))
  client.setQueryData<SessionResponse>(sessionKey(token), (before) => before && ({ ...before, user: newerResource(before.user, profile) }))
  await client.invalidateQueries({ queryKey: sessionKey(token) })
}
export async function acceptWallet(client: QueryClient, token: string, wallet: Wallet) {
  if (getSessionToken() !== token) return
  await Promise.all([client.cancelQueries({ queryKey: ['wallets', token] }), client.cancelQueries({ queryKey: sessionKey(token) }), client.cancelQueries({ queryKey: ['quote', token] })])
  if (getSessionToken() !== token) return
  client.setQueryData<{ items: Wallet[] }>(['wallets', token], (before) => before && ({ items: [...before.items.filter((item) => item.id !== wallet.id), wallet] }))
  client.setQueryData<SessionResponse>(sessionKey(token), (before) => before && ({ ...before, connection: before.connection?.walletId === wallet.id ? null : before.connection }))
  await Promise.all([client.invalidateQueries({ queryKey: ['wallets', token] }), client.invalidateQueries({ queryKey: sessionKey(token) }), client.invalidateQueries({ queryKey: ['quote', token], refetchType: 'none' })])
}
