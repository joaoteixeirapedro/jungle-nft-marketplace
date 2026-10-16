import { isCancelledError, type Query, type QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { getSessionToken } from '@/lib/session'
import { EventVersions, newerResource } from '@/lib/resource-versions'
import type { Cart, Nft, NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent, PageResult } from '@/types/marketplace'
import type { ServerReadyPayload } from '@/types/diagnostics'
import { socket } from './client'
import { publishRealtime, registerRealtimeRetry } from './state'

export function synchronizeMarketplace(client: QueryClient, token: string | null, userId: string | null) {
  let alive = true
  let ready: ServerReadyPayload | undefined
  let queue = Promise.resolve()
  let pending = 0
  let failure: string | undefined
  const versions = new EventVersions()
  const current = () => alive && getSessionToken() === token
  const owned = (query: Query, resource: string) => query.queryKey[0] === resource && query.queryKey[1] === token
  const quotes = (query: Query) => owned(query, 'quote')
  const cancel = (predicate: (query: Query) => boolean) => client.cancelQueries({ predicate })
  const refresh = async (predicate: (query: Query) => boolean) => {
    if (!current()) return
    await client.invalidateQueries({ predicate, refetchType: 'none' })
    if (current()) await client.refetchQueries({ predicate, type: 'active' }, { throwOnError: true, cancelRefetch: false })
  }
  const run = (task: () => Promise<void>) => {
    pending++
    if (current()) publishRealtime({ phase: 'syncing', ready })
    queue = queue.then(async () => { if (current()) await task() }).catch((error: unknown) => {
      if (current() && !isCancelledError(error) && !axios.isCancel(error)) failure = error instanceof Error ? error.message : 'Não foi possível atualizar os dados.'
    }).finally(() => {
      pending--
      if (!current() || !socket.connected || pending) return
      publishRealtime({ phase: failure ? 'error' : ready ? 'ready' : 'connecting', ready, error: failure })
    })
  }
  const activeResources = (query: Query) => ['catalog', 'nft'].includes(String(query.queryKey[0])) || ['session', 'profile', 'wallets', 'favorites', 'cart', 'orders', 'order'].some((resource) => owned(query, resource))
  const reconcile = () => {
    failure = undefined
    const stopped = Promise.all([cancel(activeResources), cancel(quotes)])
    void client.invalidateQueries({ predicate: quotes, refetchType: 'none' })
    run(async () => { await stopped; await refresh(activeResources); if (current()) await refresh(quotes) })
  }
  const connected = () => {
    if (!current()) return
    ready = undefined
    publishRealtime({ phase: 'connecting' })
    socket.emit('client:ready', { sessionToken: token })
  }
  const serverReady = (payload: ServerReadyPayload) => {
    if (!current() || ready || payload.service !== 'nft-marketplace-socket') return
    ready = payload // Transport readiness only. REST, not this signal, recovers domain state.
    reconcile()
  }
  const disconnected = () => {
    ready = undefined
    if (!current()) return
    publishRealtime({ phase: 'offline' })
    void cancel(quotes).then(() => { if (current()) return client.invalidateQueries({ predicate: quotes, refetchType: 'none' }) })
  }
  const connectError = (error: Error) => { if (current()) publishRealtime({ phase: 'offline', error: error.message }) }
  const nftUpdated = (event: NftUpdatedEvent) => {
    if (!current() || !ready || !event.id || event.resourceId !== event.data?.id || event.version !== event.data.version || !Number.isSafeInteger(event.version) || event.version < 1) return
    const key = ['nft', event.resourceId] as const
    const cart = client.getQueryData<Cart>(['cart', token])
    const snapshots = [client.getQueryData<Nft>(key)?.version, ...cart?.items.filter((item) => item.nftId === event.resourceId).map((item) => item.nftVersion) ?? []]
    for (const [, list] of client.getQueriesData<{ items: Nft[] }>({ predicate: (query) => query.queryKey[0] === 'catalog' || owned(query, 'favorites') })) snapshots.push(list?.items.find((item) => item.id === event.resourceId)?.version)
    // A fresh list must not hide an update still needed by a lagging detail/cart.
    // Every individual snapshot also rejects regressions via structural sharing.
    const known = Math.min(...snapshots.filter((version): version is number => version !== undefined))
    if (!versions.accept('nft', event, Number.isFinite(known) ? known : 0)) return
    const affectsCart = !cart || cart.items.some((item) => item.nftId === event.resourceId)
    const affected = (query: Query) => query.queryKey[0] === 'catalog' || (query.queryKey[0] === 'nft' && query.queryKey[1] === event.resourceId) || (owned(query, 'favorites') && !!(query.state.data as { items: Nft[] } | undefined)?.items.some((item) => item.id === event.resourceId)) || (affectsCart && owned(query, 'cart'))
    const stopped = Promise.all([cancel(affected), ...(affectsCart ? [cancel(quotes)] : [])])
    if (affectsCart) void client.invalidateQueries({ predicate: quotes, refetchType: 'none' })
    run(async () => {
      await stopped
      if (!current() || versions.version('nft', event.resourceId) !== event.version) return
      // The event contains Nft, not NftDetail; preserve REST-only creator/collection metadata.
      client.setQueryData<NftDetail>(key, (previous) => previous ? { ...previous, ...newerResource(previous, event.data) } : undefined)
      client.setQueriesData<PageResult<Nft>>({ queryKey: ['catalog'] }, (previous) => previous && ({ ...previous, items: previous.items.map((item) => item.id === event.resourceId ? newerResource(item, event.data) : item) }))
      client.setQueriesData<{ items: Nft[] }>({ predicate: (query) => owned(query, 'favorites') }, (previous) => previous && ({ ...previous, items: previous.items.map((item) => item.id === event.resourceId ? newerResource(item, event.data) : item) }))
      await refresh(affected)
      if (affectsCart && current()) await refresh(quotes)
    })
  }
  const orderUpdated = (event: OrderUpdatedEvent) => {
    if (!current() || !ready || !token || event.userId !== userId || !event.id || event.resourceId !== event.data?.id || event.version !== event.data.version || !Number.isSafeInteger(event.version) || event.version < 1) return
    const detail = client.getQueryData<Order>(['order', token, event.resourceId])
    const listed = client.getQueryData<{ items: Order[] }>(['orders', token])?.items.find((order) => order.id === event.resourceId)
    const known = Math.min(detail?.version ?? Infinity, listed?.version ?? Infinity)
    if (!versions.accept('order', event, Number.isFinite(known) ? known : 0)) return
    // Even a contradictory higher-version message cannot reopen a terminal order.
    // Read the owned REST resource; never synthesize a payment outcome from a message.
    const affected = (query: Query) => owned(query, 'orders') || (owned(query, 'order') && query.queryKey[2] === event.resourceId) || (event.data.status !== 'pending' && (owned(query, 'cart') || (owned(query, 'receipt') && query.queryKey[2] === event.resourceId)))
    const stopped = cancel(affected)
    run(async () => { await stopped; await refresh(affected) })
  }
  const removeRetry = registerRealtimeRetry(() => { if (!current()) return; if (socket.connected && ready) reconcile(); else socket.connect() })
  socket.on('connect', connected)
  socket.on('disconnect', disconnected)
  socket.on('connect_error', connectError)
  socket.on('server:ready', serverReady)
  socket.on('nft.updated', nftUpdated)
  socket.on('order.updated', orderUpdated)
  publishRealtime({ phase: 'connecting' })
  socket.connect()
  if (socket.connected) connected()
  return () => {
    alive = false
    removeRetry()
    socket.off('connect', connected)
    socket.off('disconnect', disconnected)
    socket.off('connect_error', connectError)
    socket.off('server:ready', serverReady)
    socket.off('nft.updated', nftUpdated)
    socket.off('order.updated', orderUpdated)
    socket.disconnect()
  }
}

