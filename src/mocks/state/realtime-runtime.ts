import { MockError } from '../errors.ts'
import { requireSession } from '../domain/session.ts'
import { snapshot, subscribeEvents, type DomainEvent } from './store.ts'

interface MockConnection { token: string | null; ready: boolean; send: (event: DomainEvent) => void; close: () => void }
const connections = new Map<string, MockConnection>()
const history = new Map<string, DomainEvent>()
let held = false
const allowed = (event: DomainEvent, token: string | null) => {
  if (event.type === 'nft.updated') return true
  try { return requireSession(snapshot(), token).userId === event.payload.userId } catch { return false }
}
function deliver(event: DomainEvent) {
  if (held) return
  for (const connection of connections.values()) if (connection.ready && allowed(event, connection.token)) connection.send(event)
}
subscribeEvents((event) => {
  history.set(event.payload.id, structuredClone(event))
  if (history.size > 256) history.delete(history.keys().next().value!)
  deliver(event)
})
export const realtimeHeld = () => held
export function registerMockConnection(id: string, connection: MockConnection) {
  connections.set(id, connection)
  return () => { connections.delete(id) }
}
export function realtimeMetadata(token: string | null) {
  return { held, connections: connections.size, subscriptions: [...connections.values()].filter((connection) => connection.ready).length, events: [...history.values()].filter((event) => allowed(event, token)) }
}
export function interruptRealtime(hold: boolean) { held = hold; for (const connection of [...connections.values()]) connection.close() }
export function resumeRealtime() { held = false }
export function resetRealtime() { held = false; history.clear() }
export function replayRealtime(id: string, copies: number, token: string | null) {
  const event = history.get(id)
  if (!event) throw new MockError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado no histórico da simulação.')
  if (!allowed(event, token)) throw new MockError(403, 'FORBIDDEN', 'Este evento não está disponível para a sessão.')
  for (let copy = 0; copy < copies; copy++) deliver(event)
}
