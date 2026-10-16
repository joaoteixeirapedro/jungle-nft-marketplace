import { createFixtures } from '../data/marketplace.ts'
import { nftArtwork } from '../data/artwork.ts'
import { MockError } from '../errors.ts'
import type { MockDatabase } from './model.ts'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '../../types/marketplace.ts'

export const DATABASE_KEY = 'jungle-marketplace.mock.v1'
export type DomainEvent = { type: 'nft.updated'; payload: NftUpdatedEvent } | { type: 'order.updated'; payload: OrderUpdatedEvent }
type Listener<T> = (value: T) => void
const eventListeners = new Set<Listener<DomainEvent>>()
const commitListeners = new Set<Listener<MockDatabase>>()
// Tabs share the persisted mock database. Forward committed envelopes between
// their mock runtimes; each Socket.IO subscription still authorizes delivery.
const eventChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`${DATABASE_KEY}.events`) : null
eventChannel?.addEventListener('message', (message: MessageEvent<DomainEvent>) => {
  const event = message.data
  if (event?.type !== 'nft.updated' && event?.type !== 'order.updated') return
  for (const listener of eventListeners) { try { listener(event) } catch (error) { console.error('Falha na entrega entre abas:', error) } }
})
let memory: string | null = null
let queue: Promise<unknown> = Promise.resolve()

export const now = (db: MockDatabase) => Date.now() + db.clockOffsetMs
export const nextId = (db: MockDatabase, prefix: string) => `${prefix}-${++db.sequence}`

function save(db: MockDatabase) {
  const serialized = JSON.stringify(db)
  try {
    if (typeof window === 'undefined') memory = serialized
    else window.localStorage.setItem(DATABASE_KEY, serialized)
  } catch {
    throw new MockError(507, 'STORAGE_UNAVAILABLE', 'Não foi possível persistir os dados simulados. Libere espaço e tente novamente.')
  }
}

export function snapshot(): MockDatabase {
  const raw = typeof window === 'undefined' ? memory : window.localStorage.getItem(DATABASE_KEY)
  if (!raw) return createFixtures()
  try {
    const parsed = JSON.parse(raw) as MockDatabase
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.nfts) || !Array.isArray(parsed.users) || !Array.isArray(parsed.coupons)) throw new Error('schema')
    // Upgrade only missing visual metadata; keep persisted stock, orders and users.
    for (const nft of parsed.nfts) {
      if (!nft.image.src && /^nft-\d{3}$/.test(nft.id)) nft.image = nftArtwork(Number(nft.id.slice(4)) - 1)
      if (nft.image.src?.match(/^\/assets\/figma\/(8f387|83794|9add2|b7cfc)\.png$/)) nft.image.src = nft.image.src.replace('/figma/', '/artwork/').replace('.png', '-1254.webp')
    }
    return parsed
  } catch {
    throw new MockError(500, 'MOCK_STORAGE_CORRUPTED', 'Estado simulado inválido. Restaure o cenário pelo endpoint de reset.')
  }
}

async function exclusive<T>(work: () => T): Promise<T> {
  if (typeof window !== 'undefined' && navigator.locks) return navigator.locks.request(DATABASE_KEY, work)
  const pending = queue.then(work)
  queue = pending.catch(() => undefined)
  return pending
}

export async function transaction<T>(work: (db: MockDatabase, events: DomainEvent[]) => T): Promise<T> {
  return exclusive(() => {
    const db = snapshot()
    const events: DomainEvent[] = []
    const result = work(db, events)
    save(db)
    for (const listener of commitListeners) { try { listener(db) } catch (error) { console.error('Falha no runtime de mocks:', error) } }
    for (const event of events) {
      for (const listener of eventListeners) { try { listener(event) } catch (error) { console.error('Falha na entrega do evento simulado:', error) } }
      try { eventChannel?.postMessage(event) } catch (error) { console.error('Falha ao encaminhar evento entre abas:', error) }
    }
    return structuredClone(result)
  })
}

export async function replaceDatabase(db: MockDatabase) {
  return exclusive(() => {
    save(db)
    for (const listener of commitListeners) listener(db)
  })
}

export function subscribeEvents(listener: Listener<DomainEvent>) {
  eventListeners.add(listener)
  return () => { eventListeners.delete(listener) }
}

export function subscribeCommits(listener: Listener<MockDatabase>) {
  commitListeners.add(listener)
  return () => { commitListeners.delete(listener) }
}
