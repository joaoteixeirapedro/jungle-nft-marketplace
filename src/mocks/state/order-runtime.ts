import { settleIfDue } from '../domain/orders.ts'
import type { MockDatabase } from './model.ts'
import { now, snapshot, subscribeCommits, transaction } from './store.ts'

const timers = new Map<string, ReturnType<typeof setTimeout>>()
let stop: (() => void) | undefined

function schedule(db: MockDatabase) {
  for (const [id, timer] of timers) {
    const stored = db.orders[id]
    if (!stored || stored.order.status !== 'pending' || stored.settleAt === null) { clearTimeout(timer); timers.delete(id) }
  }
  for (const [id, stored] of Object.entries(db.orders)) {
    if (stored.order.status !== 'pending' || stored.settleAt === null || timers.has(id)) continue
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      void transaction((fresh, events) => {
        const pending = fresh.orders[id]
        if (pending) settleIfDue(fresh, events, pending)
      }).catch((error: unknown) => console.error('Falha ao finalizar pedido simulado:', error))
    }, Math.max(0, stored.settleAt - now(db))))
  }
}

export function startOrderRuntime() {
  if (stop) return
  try { schedule(snapshot()) } catch { console.warn('Estado de mocks inválido. Restaure usando POST /api/__mock/reset.') }
  stop = subscribeCommits(schedule)
}

export function clearOrderTimers() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
