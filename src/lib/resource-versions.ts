import type { Cart, Nft, NftDetail, Order, PageResult } from '../types/marketplace.ts'

export function newerResource<T extends { id: string; version: number }>(previous: T | undefined, incoming: T): T {
  return previous?.id === incoming.id && previous.version > incoming.version ? previous : incoming
}
export function newerOrder(previous: Order | undefined, incoming: Order): Order {
  if (previous?.id === incoming.id && previous.status !== 'pending' && previous.status !== incoming.status) return previous
  return newerResource(previous, incoming)
}
export const shareNft = (previous: unknown, incoming: unknown) => newerResource(previous as NftDetail | undefined, incoming as NftDetail)
export const shareOrder = (previous: unknown, incoming: unknown) => newerOrder(previous as Order | undefined, incoming as Order)
export function shareCatalog(previous: unknown, incoming: unknown) {
  const before = previous as PageResult<Nft> | undefined
  const next = incoming as PageResult<Nft>
  return { ...next, items: next.items.map((item) => newerResource(before?.items.find((old) => old.id === item.id), item)) }
}
export function shareOrders(previous: unknown, incoming: unknown) {
  const before = previous as { items: Order[] } | undefined
  const next = incoming as { items: Order[] }
  return { ...next, items: next.items.map((item) => newerOrder(before?.items.find((old) => old.id === item.id), item)) }
}
export function shareCart(previous: unknown, incoming: unknown) {
  const before = previous as Cart | undefined
  const next = incoming as Cart
  if (before?.id === next.id && (before.version > next.version || next.items.some((item) => {
    const old = before.items.find((line) => line.id === item.id)
    return old && old.nftVersion > item.nftVersion
  }))) return before
  return next
}

/** Bounded per-connection bookkeeping, not a second source of domain state. */
export class EventVersions {
  private readonly ids = new Set<string>()
  private readonly versions = new Map<string, number>()
  accept(kind: string, event: { id: string; resourceId: string; version: number }, knownVersion = 0) {
    const key = `${kind}:${event.resourceId}`
    const previous = Math.max(this.versions.get(key) ?? 0, knownVersion)
    if (this.ids.has(event.id) || event.version <= previous) return false
    this.ids.add(event.id)
    this.versions.delete(key)
    this.versions.set(key, event.version)
    if (this.ids.size > 1024) this.ids.delete(this.ids.values().next().value!)
    if (this.versions.size > 1024) this.versions.delete(this.versions.keys().next().value!)
    return true
  }
  version(kind: string, id: string) { return this.versions.get(`${kind}:${id}`) ?? 0 }
}
